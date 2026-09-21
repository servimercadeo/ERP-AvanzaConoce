<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrdenCompra;
use App\Models\PedidoCompraItem;
use App\Models\Proveedor;
use App\Services\NumeroALetrasService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Orden de Compra: el documento formal hacia UN proveedor con los productos que ya
 * quedaron "Enviado a Compras" en la revisión de stock de Pedidos (no hay stock en
 * ninguna sede, hay que comprarlos). Antes de esto esos items solo se quedaban
 * marcados sin ningún documento ni seguimiento de a quién/por cuánto se le compraron.
 */
class OrdenCompraController extends Controller
{
    public function index()
    {
        return response()->json(
            OrdenCompra::with(['sede:id,nombre', 'empresa:id,nombre', 'proveedor:id,nit,nombre,naturaleza', 'formaPago:id,nombre', 'items'])
                ->orderBy('id', 'desc')
                ->get()
        );
    }

    public function show(OrdenCompra $ordenCompra)
    {
        return response()->json(
            $ordenCompra->load(['sede:id,nombre', 'empresa:id,nombre', 'proveedor:id,nit,nombre,naturaleza', 'formaPago:id,nombre', 'items'])
        );
    }

    /**
     * PDF imprimible de la orden, agrupando los productos por la sede/ciudad del
     * pedido de origen de cada uno (una orden puede consolidar productos de varias
     * sedes, ver OrdenCompraController::store()) — cada vez que la sede cambia
     * respecto al producto anterior se abre un nuevo bloque "Productos de la ciudad",
     * igual que en el formato de referencia del cliente.
     */
    public function pdf(OrdenCompra $ordenCompra)
    {
        $ordenCompra->load([
            'proveedor',
            'sede.ciudad',
            'items.pedidoCompraItem.pedido.sedeCatalogo.ciudad',
        ]);

        $grupos = [];
        $sedeAnteriorId = null;

        foreach ($ordenCompra->items as $i => $item) {
            $sede = $item->pedidoCompraItem?->pedido?->sedeCatalogo;
            $sedeId = $sede?->id ?? 'sin-sede';

            if ($sedeId !== $sedeAnteriorId) {
                $grupos[] = [
                    'ciudad'    => $sede?->ciudad?->nombre ?: '—',
                    'direccion' => $sede?->direccion ?: '—',
                    'telefono'  => $sede?->telefono ?: '',
                    'items'     => [],
                ];
                $sedeAnteriorId = $sedeId;
            }

            $grupos[count($grupos) - 1]['items'][] = [
                'num'             => $i + 1,
                'producto'        => $item->producto,
                'cantidad'        => $item->cantidad,
                'precio_unitario' => $item->precio_unitario,
                'subtotal'        => $item->subtotal,
            ];
        }

        $data = [
            'ordenNumero'     => $ordenCompra->codigo,
            'fechaOrden'      => $ordenCompra->fecha_registro->format('Y-m-d H:i:s'),
            'ciudad'          => $ordenCompra->sede?->ciudad?->nombre ?: '—',
            'proveedorNombre' => $ordenCompra->proveedor?->nombre,
            'proveedorNit'    => $ordenCompra->proveedor?->nit,
            'fechaEntrega'    => optional($ordenCompra->fecha_entrega)->format('Y-m-d') ?: '—',
            'grupos'          => $grupos,
            'observaciones'   => $ordenCompra->observaciones,
            'subtotal'        => $ordenCompra->subtotal,
            'iva'             => $ordenCompra->iva_total,
            'transporte'      => $ordenCompra->valor_transporte,
            'total'           => $ordenCompra->valor_total,
            'totalEnLetras'   => NumeroALetrasService::pesos($ordenCompra->valor_total),
        ];

        return Pdf::loadView('pdf.orden_compra', $data)->setPaper('a4')
            ->stream("orden-compra-{$ordenCompra->codigo}.pdf");
    }

    /**
     * Cuenta de productos "Enviado a Compras" que todavía no están en ninguna orden,
     * agrupados por la categoría de su tipo de producto (EPP, Equipos, Herramientas…).
     */
    public function pendientesPorCategoria()
    {
        $items = PedidoCompraItem::with('tipoProducto')
            ->where('estado_revision', 'Enviado a Compras')
            ->whereNull('orden_compra_id')
            ->get();

        $porCategoria = $items->groupBy(fn (PedidoCompraItem $it) => $it->tipoProducto?->categoria ?: 'Sin categoría');

        return response()->json(
            $porCategoria->map(fn ($grupo, $categoria) => [
                'categoria'      => $categoria,
                'cantidad_items' => $grupo->count(),
            ])->values()
        );
    }

    /**
     * Detalle de los productos pendientes de una categoría, para elegir cuáles entran
     * en la orden que se está armando (botón "Adicionar" del panel de pendientes).
     */
    public function itemsPendientes(Request $request)
    {
        $query = PedidoCompraItem::with(['tipoProducto', 'pedido:id,codigo,sede,sede_id'])
            ->where('estado_revision', 'Enviado a Compras')
            ->whereNull('orden_compra_id');

        if ($request->categoria) {
            $query->whereHas('tipoProducto', fn ($q) => $q->where('categoria', $request->categoria));
        }

        return response()->json(
            $query->get()->map(fn (PedidoCompraItem $it) => [
                'id'               => $it->id,
                'pedido_codigo'    => $it->pedido?->codigo,
                'sede'             => $it->pedido?->sede,
                'producto'         => $it->tipoProducto?->nombre ?? $it->producto,
                'categoria'        => $it->tipoProducto?->categoria,
                'tipo_producto_id' => $it->tipo_producto_id,
                'cantidad'         => $it->cantidad,
            ])
        );
    }

    /**
     * Crea la orden con sus items en una sola transacción y marca cada
     * pedido_compra_item usado como "ya en una orden" (orden_compra_id), para que deje
     * de aparecer como pendiente. La naturaleza del proveedor se copia tal cual estaba
     * en ese momento (no se vuelve a resolver después, por si el proveedor cambia).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'sede_id'                    => 'required|exists:sedes,id',
            'empresa_id'                 => 'nullable|exists:empresas,id',
            'proveedor_id'               => 'required|exists:proveedores,id',
            'forma_pago_id'              => 'nullable|exists:formas_pago,id',
            'fecha_entrega'              => 'nullable|date',
            'observaciones'              => 'nullable|string|max:1000',
            'valor_transporte'           => 'nullable|integer|min:0',
            'items'                      => 'required|array|min:1',
            'items.*.pedido_compra_item_id' => 'required|integer|exists:pedido_compra_items,id',
            'items.*.precio_unitario'    => 'required|integer|min:0',
            'items.*.iva_porcentaje'     => 'required|integer|min:0|max:100',
        ]);

        try {
            return DB::transaction(function () use ($data, $request) {
                $proveedor = Proveedor::findOrFail($data['proveedor_id']);

                $pedidoItems = PedidoCompraItem::with('tipoProducto')
                    ->whereIn('id', collect($data['items'])->pluck('pedido_compra_item_id'))
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                $subtotalOrden = 0;
                $ivaTotalOrden = 0;
                $itemsParaCrear = [];

                foreach ($data['items'] as $itemData) {
                    $pedidoItem = $pedidoItems->get($itemData['pedido_compra_item_id']);

                    if (!$pedidoItem) {
                        throw new \InvalidArgumentException('Uno de los productos elegidos ya no existe.');
                    }
                    if ($pedidoItem->estado_revision !== 'Enviado a Compras' || $pedidoItem->orden_compra_id) {
                        throw new \InvalidArgumentException("El producto \"{$pedidoItem->producto}\" ya no está disponible para comprar (puede que otra orden ya lo haya tomado).");
                    }

                    $cantidad = $pedidoItem->cantidad;
                    $subtotal = $cantidad * $itemData['precio_unitario'];
                    $ivaValor = (int) round($subtotal * $itemData['iva_porcentaje'] / 100);

                    $subtotalOrden += $subtotal;
                    $ivaTotalOrden += $ivaValor;

                    $itemsParaCrear[] = [
                        'pedido_compra_item_id' => $pedidoItem->id,
                        'tipo_producto_id'      => $pedidoItem->tipo_producto_id,
                        'producto'              => $pedidoItem->tipoProducto?->nombre ?? $pedidoItem->producto,
                        'categoria'             => $pedidoItem->tipoProducto?->categoria,
                        'cantidad'              => $cantidad,
                        'precio_unitario'       => $itemData['precio_unitario'],
                        'iva_porcentaje'        => $itemData['iva_porcentaje'],
                        'subtotal'              => $subtotal,
                        'iva_valor'             => $ivaValor,
                        'total'                 => $subtotal + $ivaValor,
                    ];
                }

                $valorTransporte = $data['valor_transporte'] ?? 0;

                $orden = OrdenCompra::create([
                    'codigo'           => OrdenCompra::generarCodigo(),
                    'fecha_registro'   => now(),
                    'sede_id'          => $data['sede_id'],
                    'empresa_id'       => $data['empresa_id'] ?? null,
                    'proveedor_id'     => $proveedor->id,
                    'naturaleza'       => $proveedor->naturaleza,
                    'forma_pago_id'    => $data['forma_pago_id'] ?? null,
                    'fecha_entrega'    => $data['fecha_entrega'] ?? null,
                    'observaciones'    => $data['observaciones'] ?? null,
                    'valor_transporte' => $valorTransporte,
                    'subtotal'         => $subtotalOrden,
                    'iva_total'        => $ivaTotalOrden,
                    'valor_total'      => $subtotalOrden + $ivaTotalOrden + $valorTransporte,
                    'estado'           => 'Creada',
                    'creado_por'       => $request->user()?->name ?? 'Sistema',
                ]);

                $orden->items()->createMany($itemsParaCrear);

                PedidoCompraItem::whereIn('id', collect($itemsParaCrear)->pluck('pedido_compra_item_id'))
                    ->update(['orden_compra_id' => $orden->id]);

                return response()->json($orden->fresh()->load(['sede:id,nombre', 'empresa:id,nombre', 'proveedor:id,nit,nombre,naturaleza', 'formaPago:id,nombre', 'items']), 201);
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Elimina la orden y libera sus productos: vuelven a aparecer como pendientes en
     * el panel de "Tipo de Elementos Pendientes en Pedidos" para poder incluirlos en
     * otra orden.
     */
    public function destroy(OrdenCompra $ordenCompra)
    {
        DB::transaction(function () use ($ordenCompra) {
            PedidoCompraItem::where('orden_compra_id', $ordenCompra->id)->update(['orden_compra_id' => null]);
            $ordenCompra->delete();
        });

        return response()->json(null, 204);
    }
}
