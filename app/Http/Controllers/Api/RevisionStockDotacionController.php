<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventarioDotacion;
use App\Models\PedidoAutomatico;
use App\Models\PedidoAutomaticoItem;
use App\Models\Proyecto;
use App\Models\Sede;
use App\Models\TrasladoDotacion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Revisión manual de stock para pedidos de Dotación marcados "Enviar a compras":
 * antes de comprar, alguien debe revisar a mano si hay stock en la sede pedida o en otra
 * sede del mismo proyecto y, si lo hay, pedir un traslado. Ninguna de las 3 acciones
 * (stock local / traslado / enviar a compras) ocurre sola: siempre las dispara un clic.
 */
class RevisionStockDotacionController extends Controller
{
    /**
     * El check "Enviar a Compras" de la fila solo se puede marcar una vez la revisión de
     * stock concluyó, para AL MENOS una prenda, que no hay existencias en ninguna sede
     * (estado_revision = 'Enviado a Compras'). Si ninguna prenda llegó a esa conclusión
     * (se resolvieron con stock propio o traslado, o aún faltan por revisar), el check
     * se rechaza server-side aunque alguien intente forzarlo desde el frontend.
     */
    public function marcarRecibido(Request $request, PedidoAutomatico $pedidoAutomatico)
    {
        $data = $request->validate([
            'recibido' => 'required|boolean',
        ]);

        if ($data['recibido']) {
            $tieneItemParaComprar = $pedidoAutomatico->items()
                ->where('estado_revision', 'Enviado a Compras')
                ->exists();

            if (!$tieneItemParaComprar) {
                return response()->json([
                    'message' => 'Primero confirma, revisando cada prenda, que no hay stock en ninguna sede.',
                ], 422);
            }
        }

        $pedidoAutomatico->update([
            'recibido_pedidos' => $data['recibido'],
            // Al confirmar el check entra a Compras arrancando en "Cotizando"; al
            // regresarlo a Pedidos se limpia para no dejar un estado de compra huérfano.
            'estado_compra' => $data['recibido'] ? 'Cotizando' : null,
        ]);

        return response()->json($pedidoAutomatico->fresh()->load(['empleado', 'contrato', 'items.inventario']));
    }

    /**
     * Cambia el estado de compra (Cotizando / Pendiente Aprobación) desde la pantalla de
     * Compras. Solo aplica a pedidos que ya pasaron el check (recibido_pedidos = true);
     * si alguien intenta forzarlo antes, se rechaza.
     */
    public function actualizarEstadoCompra(Request $request, PedidoAutomatico $pedidoAutomatico)
    {
        $data = $request->validate([
            'estado_compra' => 'required|string|in:Cotizando,Pendiente Aprobación',
        ]);

        if (!$pedidoAutomatico->recibido_pedidos) {
            return response()->json(['message' => 'Este pedido todavía no fue confirmado para Compras.'], 422);
        }

        $pedidoAutomatico->update(['estado_compra' => $data['estado_compra']]);

        return response()->json($pedidoAutomatico->fresh()->load(['empleado', 'contrato', 'items.inventario']));
    }

    public function stockPorPedido(PedidoAutomatico $pedidoAutomatico)
    {
        $pedidoAutomatico->loadMissing('contrato.sedeCatalogo');
        $items = $pedidoAutomatico->items()->with('inventario')->get();

        return response()->json(
            $items->map(fn (PedidoAutomaticoItem $item) => $this->infoStockItem($item, $pedidoAutomatico))
        );
    }

    /**
     * La sede "pedida" es la sede REAL del contrato del empleado (contrato.sede_id), no la
     * del inventario_dotacion_id que quedó guardado en el item: esa fila puede corresponder
     * a otra sede si el pedido original no se generó exactamente contra la sede del
     * empleado. Todo lo que sigue (stock mostrado, sedes del proyecto, destino del traslado)
     * se calcula contra la sede del contrato para que sea la sede correcta de verdad.
     */
    private function infoStockItem(PedidoAutomaticoItem $item, PedidoAutomatico $pedido): array
    {
        $inv = $item->inventario;
        $sedePedida = $pedido->contrato?->sedeCatalogo;

        $filaSedePedida = ($inv && $sedePedida)
            ? InventarioDotacion::where('proyecto', $inv->proyecto)
                ->where('prenda', $inv->prenda)
                ->where('genero', $inv->genero)
                ->where('talla', $inv->talla)
                ->where('sede_id', $sedePedida->id)
                ->first()
            : null;

        // Todas las demás sedes del MISMO proyecto (ej. todas las de "TIGO EXPRESS"), no
        // solo las de la misma ciudad: se listan todas, con 0 si nunca se ha manejado ahí,
        // para que el usuario elija directamente de un select en vez de una lista filtrada.
        $sedeIdsProyecto = $inv ? $this->sedeIdsValidasParaProyecto($inv->proyecto) : [];
        $sedeIdsOtras = array_values(array_diff($sedeIdsProyecto, [$sedePedida?->id]));

        $filasExistentes = ($inv && !empty($sedeIdsOtras))
            ? InventarioDotacion::whereIn('sede_id', $sedeIdsOtras)
                ->where('proyecto', $inv->proyecto)
                ->where('prenda', $inv->prenda)
                ->where('genero', $inv->genero)
                ->where('talla', $inv->talla)
                ->get()
                ->keyBy('sede_id')
            : collect();

        $sedesDisponibles = empty($sedeIdsOtras)
            ? collect()
            : Sede::whereIn('id', $sedeIdsOtras)
                ->orderBy('nombre')
                ->get(['id', 'nombre'])
                ->map(function ($sede) use ($filasExistentes) {
                    $fila = $filasExistentes->get($sede->id);
                    return [
                        'inventario_dotacion_id' => $fila?->id,
                        'sede_id'                => $sede->id,
                        'sede_nombre'            => $sede->nombre,
                        'cantidad'               => $fila->cantidad ?? 0,
                    ];
                })
                ->sortByDesc('cantidad')
                ->values();

        return [
            'item_id'          => $item->id,
            'prenda'           => $inv?->prenda,
            'genero'           => $inv?->genero,
            'talla'            => $inv?->talla,
            'cantidad'         => $item->cantidad,
            'estado_revision'  => $item->estado_revision,
            'observacion'      => $item->observacion,
            'sede_pedido'      => [
                'sede_id'  => $sedePedida?->id,
                'nombre'   => $sedePedida?->nombre,
                'cantidad' => $filaSedePedida->cantidad ?? 0,
            ],
            'sedes_disponibles' => $sedesDisponibles,
        ];
    }

    /**
     * Mismo criterio que InventarioDotacionController::sedeIdsValidasParaProyecto(): las
     * sedes que de verdad pertenecen al proyecto de dotación de esta prenda (vía el pivote
     * proyecto_sede), para no ofrecer trasladar desde una sede de otro negocio.
     */
    private function sedeIdsValidasParaProyecto(?string $proyectoDotacion): array
    {
        $nombreProyecto = $proyectoDotacion
            ? (InventarioDotacion::PROYECTO_DOTACION_A_PROYECTO[$proyectoDotacion] ?? null)
            : null;

        if (!$nombreProyecto) {
            return [];
        }

        $proyecto = Proyecto::where('nombre', $nombreProyecto)->first();

        return $proyecto ? $proyecto->sedes()->pluck('sedes.id')->all() : [];
    }

    public function marcarStockLocal(Request $request, PedidoAutomaticoItem $pedidoAutomaticoItem)
    {
        $data = $request->validate([
            'observacion' => 'required|string|max:500',
        ]);

        try {
            return DB::transaction(function () use ($data, $pedidoAutomaticoItem) {
                $inv = $pedidoAutomaticoItem->inventario;
                $sedePedida = $pedidoAutomaticoItem->pedido->contrato?->sedeCatalogo;

                if (!$inv || !$sedePedida) {
                    throw new InvalidArgumentException('No se pudo determinar la sede real del pedido.');
                }

                // "Aprobado por Stock" significa que se despacha con lo que ya hay en la
                // sede pedida: hay que confirmar que de verdad alcanza y descontarlo, igual
                // que un traslado descuenta la sede de origen. Si no alcanza, se rechaza
                // para forzar al usuario a usar un traslado o enviar a Compras.
                $filaSedePedida = InventarioDotacion::where('proyecto', $inv->proyecto)
                    ->where('prenda', $inv->prenda)
                    ->where('genero', $inv->genero)
                    ->where('talla', $inv->talla)
                    ->where('sede_id', $sedePedida->id)
                    ->lockForUpdate()
                    ->first();

                if (!$filaSedePedida || $filaSedePedida->cantidad < $pedidoAutomaticoItem->cantidad) {
                    $disponible = $filaSedePedida->cantidad ?? 0;
                    throw new InvalidArgumentException("Solo hay {$disponible} disponibles en la sede pedida, no alcanza para {$pedidoAutomaticoItem->cantidad}. Usa un traslado o envía a Compras.");
                }

                $filaSedePedida->decrement('cantidad', $pedidoAutomaticoItem->cantidad);

                $pedidoAutomaticoItem->update([
                    'estado_revision' => 'Aprobado por Stock',
                    'observacion'     => $data['observacion'],
                ]);
                $this->sincronizarEstadoPedido($pedidoAutomaticoItem->pedido);

                return response()->json(
                    $pedidoAutomaticoItem->pedido->load('items.inventario')
                );
            });
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function solicitarTraslado(Request $request, PedidoAutomaticoItem $pedidoAutomaticoItem)
    {
        $data = $request->validate([
            'inventario_dotacion_origen_id' => 'required|exists:inventario_dotacion,id',
            'cantidad'                      => 'required|integer|min:1',
        ]);

        try {
            return DB::transaction(function () use ($data, $pedidoAutomaticoItem, $request) {
                $inv = $pedidoAutomaticoItem->inventario;
                $sedePedida = $pedidoAutomaticoItem->pedido->contrato?->sedeCatalogo;

                if (!$inv || !$sedePedida) {
                    throw new InvalidArgumentException('No se pudo determinar la sede real del pedido.');
                }

                // La fila de inventario para la sede pedida puede no existir todavía (nunca
                // se había manejado esa prenda ahí): se crea en 0 y luego se le suma el traslado.
                $destino = InventarioDotacion::where('proyecto', $inv->proyecto)
                    ->where('prenda', $inv->prenda)
                    ->where('genero', $inv->genero)
                    ->where('talla', $inv->talla)
                    ->where('sede_id', $sedePedida->id)
                    ->lockForUpdate()
                    ->first();

                if (!$destino) {
                    $destino = InventarioDotacion::create([
                        'proyecto'     => $inv->proyecto,
                        'prenda'       => $inv->prenda,
                        'genero'       => $inv->genero,
                        'talla'        => $inv->talla,
                        'sede_id'      => $sedePedida->id,
                        'precio'       => $inv->precio,
                        'cantidad'     => 0,
                        'stock_minimo' => 0,
                    ]);
                }

                $origen = InventarioDotacion::lockForUpdate()->findOrFail($data['inventario_dotacion_origen_id']);

                if ($origen->id === $destino->id) {
                    throw new InvalidArgumentException('La sede de origen no puede ser la misma sede pedida.');
                }
                if ($origen->cantidad < $data['cantidad']) {
                    throw new InvalidArgumentException("Solo hay {$origen->cantidad} disponibles en esa sede.");
                }

                $origen->decrement('cantidad', $data['cantidad']);
                $destino->increment('cantidad', $data['cantidad']);

                TrasladoDotacion::create([
                    'pedido_automatico_id'          => $pedidoAutomaticoItem->pedido_automatico_id,
                    'pedido_automatico_item_id'     => $pedidoAutomaticoItem->id,
                    'inventario_dotacion_origen_id' => $origen->id,
                    'sede_destino_id'                => $destino->sede_id,
                    'prenda'                         => $destino->prenda,
                    'genero'                         => $destino->genero,
                    'talla'                          => $destino->talla,
                    'cantidad'                       => $data['cantidad'],
                    'estado'                         => 'Completado',
                    'solicitado_por'                 => $request->user()?->name ?? 'Sistema',
                ]);

                $pedidoAutomaticoItem->update(['estado_revision' => 'Traslado Solicitado']);
                $this->sincronizarEstadoPedido($pedidoAutomaticoItem->pedido);

                return response()->json(
                    $pedidoAutomaticoItem->pedido->load('items.inventario')
                );
            });
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function enviarACompras(Request $request, PedidoAutomaticoItem $pedidoAutomaticoItem)
    {
        $pedidoAutomaticoItem->update(['estado_revision' => 'Enviado a Compras']);
        $this->sincronizarEstadoPedido($pedidoAutomaticoItem->pedido);

        return response()->json(
            $pedidoAutomaticoItem->pedido->load('items.inventario')
        );
    }

    /**
     * Deshace la revisión de una prenda para poder rehacerla (ej. se aprobó por stock o se
     * pidió un traslado con datos que luego resultaron incorrectos). Si lo que se deshace es
     * un traslado, revierte el movimiento de stock (regresa cantidad al origen, la quita del
     * destino) y cancela el registro; nunca deja el inventario descuadrado. Si el pedido ya
     * no tiene ninguna prenda "Enviado a Compras" tras deshacer, también desmarca el check.
     */
    public function deshacerRevision(PedidoAutomaticoItem $pedidoAutomaticoItem)
    {
        if (!$pedidoAutomaticoItem->estado_revision) {
            return response()->json(['message' => 'Esta prenda todavía no tiene una revisión que deshacer.'], 422);
        }

        return DB::transaction(function () use ($pedidoAutomaticoItem) {
            if ($pedidoAutomaticoItem->estado_revision === 'Traslado Solicitado') {
                $traslado = TrasladoDotacion::where('pedido_automatico_item_id', $pedidoAutomaticoItem->id)
                    ->where('estado', 'Completado')
                    ->latest()
                    ->first();

                if ($traslado) {
                    $origen = InventarioDotacion::lockForUpdate()->find($traslado->inventario_dotacion_origen_id);
                    $destino = InventarioDotacion::where('proyecto', $pedidoAutomaticoItem->inventario?->proyecto)
                        ->where('prenda', $traslado->prenda)
                        ->where('genero', $traslado->genero)
                        ->where('talla', $traslado->talla)
                        ->where('sede_id', $traslado->sede_destino_id)
                        ->lockForUpdate()
                        ->first();

                    if ($origen) {
                        $origen->increment('cantidad', $traslado->cantidad);
                    }
                    if ($destino) {
                        $destino->decrement('cantidad', $traslado->cantidad);
                    }

                    $traslado->update(['estado' => 'Cancelado']);
                }
            }

            if ($pedidoAutomaticoItem->estado_revision === 'Aprobado por Stock') {
                $inv = $pedidoAutomaticoItem->inventario;
                $sedePedida = $pedidoAutomaticoItem->pedido->contrato?->sedeCatalogo;

                if ($inv && $sedePedida) {
                    $filaSedePedida = InventarioDotacion::where('proyecto', $inv->proyecto)
                        ->where('prenda', $inv->prenda)
                        ->where('genero', $inv->genero)
                        ->where('talla', $inv->talla)
                        ->where('sede_id', $sedePedida->id)
                        ->lockForUpdate()
                        ->first();

                    if ($filaSedePedida) {
                        $filaSedePedida->increment('cantidad', $pedidoAutomaticoItem->cantidad);
                    }
                }
            }

            $pedidoAutomaticoItem->update(['estado_revision' => null, 'observacion' => null]);

            $pedido = $pedidoAutomaticoItem->pedido;
            $siguesTeniendoItemParaComprar = $pedido->items()
                ->where('estado_revision', 'Enviado a Compras')
                ->exists();

            if (!$siguesTeniendoItemParaComprar && $pedido->recibido_pedidos) {
                $pedido->update(['recibido_pedidos' => false, 'estado_compra' => null]);
            }

            return response()->json($pedido->fresh()->load('items.inventario'));
        });
    }

    /**
     * Revisar el stock de una prenda NUNCA debe sacar el pedido de la pantalla de Pedidos
     * por sí solo (eso sería un cambio automático). El pedido solo deja de aparecer ahí
     * cuando alguien lo decide a mano en otro paso; aquí solo se deja constancia de que
     * al menos una prenda sigue necesitando compra, sin tocar nada más.
     */
    private function sincronizarEstadoPedido(PedidoAutomatico $pedido): void
    {
        $items = $pedido->items()->get();

        if ($items->contains(fn ($it) => $it->estado_revision === 'Enviado a Compras')) {
            $pedido->update(['estado' => 'Enviar a compras']);
        }
    }
}
