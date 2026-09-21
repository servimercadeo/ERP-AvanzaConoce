<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventarioProducto;
use App\Models\InventarioProductoSerie;
use App\Models\PedidoCompra;
use App\Models\PedidoCompraItem;
use App\Models\Sede;
use App\Models\TrasladoProducto;
use App\Services\ActaPedidoCompraService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Misma revisión manual de stock que RevisionStockDotacionController, pero para los
 * pedidos normales de oficina (Activos, Materiales, Equipos, EPP, Herramientas), que
 * ahora también tienen inventario real por sede (inventario_productos). Aquí no hay
 * concepto de "proyecto": se puede pedir traslado desde cualquier otra sede del
 * catálogo, no solo las de la misma ciudad.
 */
class RevisionStockPedidoCompraController extends Controller
{
    public function stockPorPedido(PedidoCompra $pedidoCompra)
    {
        $pedidoCompra->loadMissing('sedeCatalogo');
        $items = $pedidoCompra->items()->with('tipoProducto')->get();

        return response()->json(
            $items->map(fn (PedidoCompraItem $item) => $this->infoStockItem($item, $pedidoCompra))
        );
    }

    private function infoStockItem(PedidoCompraItem $item, PedidoCompra $pedido): array
    {
        $tipoProductoId = $item->tipo_producto_id;
        $sedePedida = $pedido->sedeCatalogo;

        $filaSedePedida = ($tipoProductoId && $sedePedida)
            ? InventarioProducto::where('tipo_producto_id', $tipoProductoId)
                ->where('sede_id', $sedePedida->id)
                ->first()
            : null;

        // Todas las sedes del catálogo (menos la pedida), no solo las que ya tienen una fila
        // de inventario para este producto: si nunca se ha manejado ahí, se muestra en 0 en
        // vez de desaparecer del select.
        $filasExistentes = $tipoProductoId
            ? InventarioProducto::where('tipo_producto_id', $tipoProductoId)
                ->where('sede_id', '!=', $sedePedida?->id)
                ->get()
                ->keyBy('sede_id')
            : collect();

        $disponibles = $tipoProductoId
            ? Sede::where('id', '!=', $sedePedida?->id)
                ->orderBy('nombre')
                ->get(['id', 'nombre'])
                ->map(function ($sede) use ($filasExistentes) {
                    $fila = $filasExistentes->get($sede->id);
                    return [
                        'inventario_producto_id' => $fila?->id,
                        'sede_id'                => $sede->id,
                        'sede_nombre'            => $sede->nombre,
                        'cantidad'               => $fila->cantidad ?? 0,
                    ];
                })
                ->sortByDesc('cantidad')
                ->values()
            : collect();

        return [
            'item_id'           => $item->id,
            'producto'          => $item->tipoProducto?->nombre ?? $item->producto,
            'cantidad'          => $item->cantidad,
            'estado_revision'   => $item->estado_revision,
            'observacion'       => $item->observacion,
            'sede_pedido'       => [
                'sede_id'  => $sedePedida?->id,
                'nombre'   => $sedePedida?->nombre,
                'cantidad' => $filaSedePedida->cantidad ?? 0,
                // Si el producto es serializado, hay que elegir CUÁLES seriales se
                // despachan antes de poder aprobar por stock (ver marcarStockLocal()).
                'series'   => $filaSedePedida ? $filaSedePedida->series()->orderBy('serial')->pluck('serial')->all() : [],
            ],
            'sedes_disponibles' => $disponibles,
        ];
    }

    public function marcarStockLocal(Request $request, PedidoCompraItem $pedidoCompraItem)
    {
        $data = $request->validate([
            'observacion' => 'required|string|max:500',
            'seriales'    => 'array',
            'seriales.*'  => 'string|max:100',
        ]);

        try {
            return DB::transaction(function () use ($data, $pedidoCompraItem) {
                $sedePedida = $pedidoCompraItem->pedido->sedeCatalogo;

                if (!$pedidoCompraItem->tipo_producto_id || !$sedePedida) {
                    throw new InvalidArgumentException('No se pudo determinar la sede real del pedido.');
                }

                // "Aprobado por Stock" significa que se despacha con lo que ya hay en la
                // sede pedida: hay que confirmar que de verdad alcanza y descontarlo, igual
                // que un traslado descuenta la sede de origen. Si no alcanza, se rechaza
                // para forzar al usuario a usar un traslado o enviar a Compras.
                $filaSedePedida = InventarioProducto::where('tipo_producto_id', $pedidoCompraItem->tipo_producto_id)
                    ->where('sede_id', $sedePedida->id)
                    ->lockForUpdate()
                    ->first();

                if (!$filaSedePedida || $filaSedePedida->cantidad < $pedidoCompraItem->cantidad) {
                    $disponible = $filaSedePedida->cantidad ?? 0;
                    throw new InvalidArgumentException("Solo hay {$disponible} disponibles en la sede pedida, no alcanza para {$pedidoCompraItem->cantidad}. Usa un traslado o envía a Compras.");
                }

                // Si el producto tiene seriales registrados en esta sede, hay que elegir
                // EXACTAMENTE cuáles se despachan (o todos los que haya, si hay menos
                // seriales que cantidad pedida) antes de poder aprobar.
                $seriesDisponibles = $filaSedePedida->series()->pluck('serial');
                $seleccionados = collect($data['seriales'] ?? [])->filter()->values();

                if ($seriesDisponibles->isNotEmpty()) {
                    $esperados = min($pedidoCompraItem->cantidad, $seriesDisponibles->count());

                    if ($seleccionados->count() !== $esperados) {
                        throw new InvalidArgumentException("Este producto es serializado: elige {$esperados} serial(es) antes de aprobar por stock.");
                    }
                    if ($seleccionados->diff($seriesDisponibles)->isNotEmpty()) {
                        throw new InvalidArgumentException('Alguno de los seriales elegidos ya no está disponible.');
                    }

                    InventarioProductoSerie::where('inventario_producto_id', $filaSedePedida->id)
                        ->whereIn('serial', $seleccionados)
                        ->delete();
                }

                $filaSedePedida->decrement('cantidad', $pedidoCompraItem->cantidad);

                $pedidoCompraItem->update([
                    'estado_revision' => 'Aprobado por Stock',
                    'observacion'     => $data['observacion'],
                    'seriales'        => $seleccionados->isNotEmpty() ? $seleccionados->implode(', ') : null,
                ]);

                return response()->json($pedidoCompraItem->pedido->load('items'));
            });
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Solo REGISTRA la solicitud de traslado — ya no mueve stock aquí. El movimiento
     * real (descontar origen, sumar destino) y el envío del acta quedan diferidos a
     * cuando alguien lo apruebe en Inventario General > Aprobación de Traslado (ver
     * TrasladoProductoController::aprobar()), para que inventario pueda confirmar el
     * movimiento antes de que quede hecho.
     */
    public function solicitarTraslado(Request $request, PedidoCompraItem $pedidoCompraItem)
    {
        $data = $request->validate([
            'inventario_producto_origen_id' => 'required|exists:inventario_productos,id',
            'cantidad'                      => 'required|integer|min:1',
        ]);

        try {
            return DB::transaction(function () use ($data, $pedidoCompraItem, $request) {
                $pedido = $pedidoCompraItem->pedido;
                $sedePedida = $pedido->sedeCatalogo;

                if (!$pedidoCompraItem->tipo_producto_id || !$sedePedida) {
                    throw new InvalidArgumentException('No se pudo determinar la sede real del pedido.');
                }

                $origen = InventarioProducto::lockForUpdate()->findOrFail($data['inventario_producto_origen_id']);

                if ($origen->sede_id === $sedePedida->id) {
                    throw new InvalidArgumentException('La sede de origen no puede ser la misma sede pedida.');
                }
                if ($origen->cantidad < $data['cantidad']) {
                    throw new InvalidArgumentException("Solo hay {$origen->cantidad} disponibles en esa sede.");
                }

                TrasladoProducto::create([
                    'pedido_compra_id'              => $pedidoCompraItem->pedido_compra_id,
                    'pedido_compra_item_id'         => $pedidoCompraItem->id,
                    'inventario_producto_origen_id' => $origen->id,
                    'sede_destino_id'                => $sedePedida->id,
                    'producto'                       => $pedidoCompraItem->tipoProducto?->nombre ?? $pedidoCompraItem->producto,
                    'cantidad'                       => $data['cantidad'],
                    'estado'                         => 'Pendiente Aprobación',
                    'solicitado_por'                 => $request->user()?->name ?? 'Sistema',
                ]);

                $pedidoCompraItem->update(['estado_revision' => 'Traslado Solicitado']);

                return response()->json($pedidoCompraItem->pedido->load('items'));
            });
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function enviarACompras(PedidoCompraItem $pedidoCompraItem)
    {
        $pedidoCompraItem->update(['estado_revision' => 'Enviado a Compras']);

        return response()->json($pedidoCompraItem->pedido->load('items'));
    }

    /**
     * Deshace la revisión de un item (mismo criterio que en Dotación): si era un
     * traslado, revierte el movimiento de stock antes de limpiar el estado.
     */
    public function deshacerRevision(PedidoCompraItem $pedidoCompraItem)
    {
        if (!$pedidoCompraItem->estado_revision) {
            return response()->json(['message' => 'Este producto todavía no tiene una revisión que deshacer.'], 422);
        }

        return DB::transaction(function () use ($pedidoCompraItem) {
            if (in_array($pedidoCompraItem->estado_revision, ['Traslado Solicitado', 'Traslado Aprobado'], true)) {
                $traslado = TrasladoProducto::where('pedido_compra_item_id', $pedidoCompraItem->id)
                    ->whereIn('estado', ['Pendiente Aprobación', 'Completado'])
                    ->latest()
                    ->first();

                if ($traslado) {
                    // Si ya estaba aprobado, el movimiento de stock sí se hizo de verdad y
                    // hay que revertirlo. Si seguía pendiente, no se había movido nada
                    // todavía y solo hace falta cancelar la solicitud.
                    if ($traslado->estado === 'Completado') {
                        $origen = InventarioProducto::lockForUpdate()->find($traslado->inventario_producto_origen_id);
                        $destino = InventarioProducto::where('tipo_producto_id', $pedidoCompraItem->tipo_producto_id)
                            ->where('sede_id', $traslado->sede_destino_id)
                            ->lockForUpdate()
                            ->first();

                        if ($origen) {
                            $origen->increment('cantidad', $traslado->cantidad);
                        }
                        if ($destino) {
                            $destino->decrement('cantidad', $traslado->cantidad);
                        }

                        // Si se habían movido seriales puntuales, vuelven al origen y salen
                        // del destino (misma identidad, no solo la cantidad).
                        if ($traslado->seriales) {
                            $seriales = array_filter(array_map('trim', explode(',', $traslado->seriales)));

                            if ($destino) {
                                InventarioProductoSerie::where('inventario_producto_id', $destino->id)
                                    ->whereIn('serial', $seriales)
                                    ->delete();
                            }
                            if ($origen) {
                                foreach ($seriales as $serial) {
                                    InventarioProductoSerie::firstOrCreate([
                                        'inventario_producto_id' => $origen->id,
                                        'serial'                 => $serial,
                                    ]);
                                }
                            }
                        }
                    }

                    $traslado->update(['estado' => 'Cancelado']);
                }
            }

            if ($pedidoCompraItem->estado_revision === 'Aprobado por Stock') {
                $sedePedida = $pedidoCompraItem->pedido->sedeCatalogo;

                if ($pedidoCompraItem->tipo_producto_id && $sedePedida) {
                    $filaSedePedida = InventarioProducto::where('tipo_producto_id', $pedidoCompraItem->tipo_producto_id)
                        ->where('sede_id', $sedePedida->id)
                        ->lockForUpdate()
                        ->first();

                    if ($filaSedePedida) {
                        $filaSedePedida->increment('cantidad', $pedidoCompraItem->cantidad);

                        if ($pedidoCompraItem->seriales) {
                            foreach (array_filter(array_map('trim', explode(',', $pedidoCompraItem->seriales))) as $serial) {
                                InventarioProductoSerie::firstOrCreate([
                                    'inventario_producto_id' => $filaSedePedida->id,
                                    'serial'                 => $serial,
                                ]);
                            }
                        }
                    }
                }
            }

            $pedidoCompraItem->update(['estado_revision' => null, 'observacion' => null, 'seriales' => null]);

            $pedido = $pedidoCompraItem->pedido;
            $siguesTeniendoItemParaComprar = $pedido->items()
                ->where('estado_revision', 'Enviado a Compras')
                ->exists();

            if (!$siguesTeniendoItemParaComprar && $pedido->estado === 'Enviado a compras') {
                $pedido->update(['estado' => 'Pendiente Aprobación', 'estado_compra' => null]);
            }

            return response()->json($pedido->fresh()->load('items'));
        });
    }

    /**
     * Reenvío manual del acta de un traslado YA APROBADO (por si el correo se perdió o
     * hay que mandarlo de nuevo) — el envío automático ocurre una sola vez, al aprobar,
     * en TrasladoProductoController::aprobar().
     */
    public function actaTraslado(Request $request, PedidoCompraItem $pedidoCompraItem)
    {
        if ($pedidoCompraItem->estado_revision !== 'Traslado Aprobado') {
            return response()->json(['message' => 'Este producto no tiene un traslado aprobado.'], 422);
        }

        $traslado = TrasladoProducto::where('pedido_compra_item_id', $pedidoCompraItem->id)
            ->where('estado', 'Completado')
            ->latest()
            ->first();

        if (!$traslado) {
            return response()->json(['message' => 'No se encontró el traslado de este producto.'], 422);
        }

        return response()->json(
            app(ActaPedidoCompraService::class)->enviarActaTraslado($traslado, $request->user()?->name ?? 'Sistema')
        );
    }
}
