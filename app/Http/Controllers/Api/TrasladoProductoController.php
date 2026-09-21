<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventarioProducto;
use App\Models\InventarioProductoSerie;
use App\Models\TrasladoProducto;
use App\Services\ActaPedidoCompraService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Aprobación de Traslado (Inventario General): cuando en Pedidos revisan stock y piden
 * traer un producto de otra sede, la solicitud queda "Pendiente Aprobación" aquí — el
 * movimiento de stock (descontar origen, sumar destino) y el envío del Acta de Traslado
 * solo ocurren cuando alguien la aprueba en esta pantalla, no al momento de pedirla (ver
 * RevisionStockPedidoCompraController::solicitarTraslado()).
 */
class TrasladoProductoController extends Controller
{
    public function index(Request $request)
    {
        $query = TrasladoProducto::with([
            'item.tipoProducto',
            'pedido:id,codigo,responsable,sede',
            'origen.tipoProducto',
            'origen.sede',
            'origen.series',
            'sedeDestino:id,nombre',
        ])->orderBy('created_at', 'desc');

        if ($request->filled('estado')) {
            $query->where('estado', $request->string('estado'));
        }

        return response()->json($query->get());
    }

    public function aprobar(Request $request, TrasladoProducto $trasladoProducto)
    {
        if ($trasladoProducto->estado !== 'Pendiente Aprobación') {
            return response()->json(['message' => 'Este traslado ya fue resuelto.'], 422);
        }

        $data = $request->validate([
            'seriales'   => 'array',
            'seriales.*' => 'string|max:100',
        ]);

        try {
            $resultado = DB::transaction(function () use ($trasladoProducto, $data, $request) {
                $item = $trasladoProducto->item;

                if (!$item) {
                    throw new InvalidArgumentException('No se encontró el producto del pedido asociado a este traslado.');
                }

                $origen = InventarioProducto::lockForUpdate()->find($trasladoProducto->inventario_producto_origen_id);

                if (!$origen) {
                    throw new InvalidArgumentException('La sede de origen de este traslado ya no existe en el inventario.');
                }
                if ($origen->cantidad < $trasladoProducto->cantidad) {
                    throw new InvalidArgumentException("Ya no hay suficiente stock en la sede de origen: solo quedan {$origen->cantidad}.");
                }

                // Si el producto de origen tiene seriales, hay que elegir EXACTAMENTE
                // cuáles viajan (o todos los que haya, si hay menos que la cantidad) antes
                // de poder aprobar — se mueven de identidad, no solo de cantidad.
                $seriesDisponibles = InventarioProductoSerie::where('inventario_producto_id', $origen->id)->pluck('serial');
                $seleccionados = collect($data['seriales'] ?? [])->filter()->values();

                if ($seriesDisponibles->isNotEmpty()) {
                    $esperados = min($trasladoProducto->cantidad, $seriesDisponibles->count());

                    if ($seleccionados->count() !== $esperados) {
                        throw new InvalidArgumentException("Este producto es serializado: elige {$esperados} serial(es) antes de aprobar.");
                    }
                    if ($seleccionados->diff($seriesDisponibles)->isNotEmpty()) {
                        throw new InvalidArgumentException('Alguno de los seriales elegidos ya no está disponible en el origen.');
                    }
                }

                $destino = InventarioProducto::where('tipo_producto_id', $item->tipo_producto_id)
                    ->where('sede_id', $trasladoProducto->sede_destino_id)
                    ->lockForUpdate()
                    ->first();

                if (!$destino) {
                    $destino = InventarioProducto::create([
                        'tipo_producto_id' => $item->tipo_producto_id,
                        'sede_id'          => $trasladoProducto->sede_destino_id,
                        'precio'           => 0,
                        'cantidad'         => 0,
                        'stock_minimo'     => 0,
                    ]);
                }

                $origen->decrement('cantidad', $trasladoProducto->cantidad);
                $destino->increment('cantidad', $trasladoProducto->cantidad);

                if ($seleccionados->isNotEmpty()) {
                    InventarioProductoSerie::where('inventario_producto_id', $origen->id)
                        ->whereIn('serial', $seleccionados)
                        ->delete();

                    foreach ($seleccionados as $serial) {
                        InventarioProductoSerie::create([
                            'inventario_producto_id' => $destino->id,
                            'serial'                 => $serial,
                        ]);
                    }
                }

                $trasladoProducto->update([
                    'estado'       => 'Completado',
                    'aprobado_por' => $request->user()?->name ?? 'Sistema',
                    'aprobado_en'  => now(),
                    'seriales'     => $seleccionados->isNotEmpty() ? $seleccionados->implode(', ') : null,
                ]);

                $item->update(['estado_revision' => 'Traslado Aprobado']);

                return $trasladoProducto;
            });

            $acta = app(ActaPedidoCompraService::class)->enviarActaTraslado(
                $resultado->fresh(['item.pedido', 'item.tipoProducto', 'origen.sede', 'sedeDestino']),
                $request->user()?->name ?? 'Sistema'
            );

            return response()->json(array_merge($resultado->fresh()->toArray(), ['acta' => $acta]));
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function rechazar(Request $request, TrasladoProducto $trasladoProducto)
    {
        if ($trasladoProducto->estado !== 'Pendiente Aprobación') {
            return response()->json(['message' => 'Este traslado ya fue resuelto.'], 422);
        }

        $data = $request->validate([
            'motivo' => 'nullable|string|max:500',
        ]);

        $trasladoProducto->update([
            'estado'       => 'Rechazado',
            'aprobado_por' => $request->user()?->name ?? 'Sistema',
            'aprobado_en'  => now(),
        ]);

        // Vuelve a dejar el producto sin revisar para que en Pedidos elijan otra
        // salida (stock local, otro traslado, o enviarlo a Compras).
        $item = $trasladoProducto->item;
        if ($item) {
            $item->update([
                'estado_revision' => null,
                'observacion'     => $data['motivo'] ?? null,
            ]);
        }

        return response()->json($trasladoProducto->fresh());
    }
}
