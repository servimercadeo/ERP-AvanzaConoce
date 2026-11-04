<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\OrdenCompra;
use App\Models\OrdenCompraItem;
use App\Models\PedidoAutomatico;
use App\Models\PedidoAutomaticoItem;
use App\Models\PedidoCompraItem;
use App\Models\Proveedor;
use App\Services\NumeroALetrasService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Orden de Compra: el documento formal hacia UN proveedor con lo que hay que comprar de los
 * pedidos que están en Compras: los productos de oficina "Enviado a Compras" en la revisión
 * de stock de un pedido ya enviado, y las prendas de dotación que quedaron por comprar.
 * Completar una orden con dotación genera el Excel para Inventario de dotación, que asigna lo
 * comprado al pedido que lo pidió.
 */
class OrdenCompraController extends Controller
{
    public function index()
    {
        return response()->json(
            OrdenCompra::with(['sede:id,nombre', 'empresa:id,nombre', 'proveedor:id,nit,nombre,naturaleza', 'formaPago:id,nombre', 'items.empresa:id,nombre'])
                ->orderBy('id', 'desc')
                ->get()
        );
    }

    public function show(OrdenCompra $ordenCompra)
    {
        return response()->json(
            $ordenCompra->load(['sede:id,nombre', 'empresa:id,nombre', 'proveedor:id,nit,nombre,naturaleza', 'formaPago:id,nombre', 'items.empresa:id,nombre'])
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
            'items.empresa',
            'items.pedidoCompraItem.pedido.sedeCatalogo.ciudad',
            'items.inventarioDotacion.sede.ciudad',
        ]);

        $grupos = [];
        $sedeAnteriorId = null;

        foreach ($ordenCompra->items as $i => $item) {
            $sede = $item->pedidoCompraItem?->pedido?->sedeCatalogo ?? $item->inventarioDotacion?->sede;
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
                'empresa'         => $item->empresa?->nombre,
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
     * Cuenta de lo pendiente por comprar que todavía no está en ninguna orden, agrupado por la
     * categoría de su tipo de producto (EPP, Equipos, Herramientas…). Las prendas son "Dotación".
     */
    public function pendientesPorCategoria()
    {
        $conteo = $this->productosPendientes()->with('tipoProducto')->get()
            ->countBy(fn (PedidoCompraItem $it) => $it->tipoProducto?->categoria ?: 'Sin categoría');

        $prendas = $this->prendasPendientes()->count();
        if ($prendas > 0) {
            $conteo[OrdenCompraItem::CATEGORIA_DOTACION] = ($conteo[OrdenCompraItem::CATEGORIA_DOTACION] ?? 0) + $prendas;
        }

        return response()->json(
            $conteo->map(fn ($cantidad, $categoria) => [
                'categoria'      => $categoria,
                'cantidad_items' => $cantidad,
            ])->values()
        );
    }

    /**
     * Detalle de lo pendiente de una categoría, para elegir qué entra en la orden que se está
     * armando (botón "Adicionar" del panel de pendientes). Producto y prenda son tablas
     * distintas y sus ids se repiten: "origen" dice de cuál es cada uno.
     */
    public function itemsPendientes(Request $request)
    {
        $query = $this->productosPendientes()->with(['tipoProducto', 'pedido:id,codigo,sede,sede_id,empresa_id', 'pedido.empresa:id,nombre']);

        if ($request->categoria) {
            $query->whereHas('tipoProducto', fn ($q) => $q->where('categoria', $request->categoria));
        }

        $productos = $query->get()->map(fn (PedidoCompraItem $it) => [
            'id'               => $it->id,
            'origen'           => 'oficina',
            'pedido_codigo'    => $it->pedido?->codigo,
            'sede'             => $it->pedido?->sede,
            'producto'         => $it->tipoProducto?->nombre ?? $it->producto,
            'categoria'        => $it->tipoProducto?->categoria,
            'tipo_producto_id' => $it->tipo_producto_id,
            'cantidad'         => $it->cantidad,
            'empresa'          => $it->pedido?->empresa?->nombre,
        ]);

        $prendas = collect();
        if (!$request->categoria || $request->categoria === OrdenCompraItem::CATEGORIA_DOTACION) {
            $prendas = $this->prendasPendientes()->with(['inventario.sede:id,nombre', 'pedido.contrato:id,empresa'])->get()
                ->map(fn (PedidoAutomaticoItem $it) => [
                    'id'               => $it->id,
                    'origen'           => 'dotacion',
                    'pedido_codigo'    => $it->pedido->codigo,
                    'sede'             => $it->inventario?->sede?->nombre,
                    'producto'         => $this->nombrePrenda($it),
                    'categoria'        => OrdenCompraItem::CATEGORIA_DOTACION,
                    'tipo_producto_id' => null,
                    'cantidad'         => $it->cantidad_por_comprar,
                    'empresa'          => $it->pedido->contrato?->empresa,
                ]);
        }

        return response()->json($productos->toBase()->concat($prendas)->values());
    }

    /** Productos de oficina por comprar: el pedido ya debe estar en la pantalla de Compras. */
    private function productosPendientes()
    {
        return PedidoCompraItem::where('estado_revision', 'Enviado a Compras')
            ->whereNull('orden_compra_id')
            ->whereHas('pedido', fn ($q) => $q->where('estado', 'Enviado a compras'));
    }

    /** Prendas de dotación por comprar de los pedidos que están en la pantalla de Compras. */
    private function prendasPendientes()
    {
        return PedidoAutomaticoItem::where('cantidad_por_comprar', '>', 0)
            ->whereNull('orden_compra_id')
            ->whereHas('pedido', fn ($q) => $q->where('estado', PedidoAutomatico::ENVIAR_A_COMPRAS)->where('recibido_pedidos', true));
    }

    private function nombrePrenda(PedidoAutomaticoItem $linea): string
    {
        $inv = $linea->inventario;

        return mb_substr("{$inv?->prenda} · {$inv?->genero} · T:{$inv?->talla}", 0, 150);
    }

    /**
     * Crea la orden con sus items en una sola transacción y marca cada producto o prenda
     * usado como "ya en una orden" (orden_compra_id), para que deje de aparecer como
     * pendiente. La naturaleza del proveedor se copia tal cual estaba
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
            // Precios y transporte aceptan centavos (hasta 2 decimales, ej. 150.50).
            'valor_transporte'           => 'nullable|numeric|min:0|decimal:0,2',
            'items'                      => 'required|array|min:1',
            // Cada fila es un producto de oficina o una prenda de dotación.
            'items.*.pedido_compra_item_id'     => 'required_without:items.*.pedido_automatico_item_id|nullable|integer|exists:pedido_compra_items,id',
            'items.*.pedido_automatico_item_id' => 'nullable|integer|distinct|exists:pedido_automatico_items,id',
            'items.*.precio_unitario'    => 'required|numeric|min:0|decimal:0,2',
            'items.*.iva_porcentaje'     => 'required|integer|min:0|max:100',
        ]);

        try {
            return DB::transaction(function () use ($data, $request) {
                $proveedor = Proveedor::findOrFail($data['proveedor_id']);

                $pedidoItems = PedidoCompraItem::with(['tipoProducto', 'pedido:id,empresa_id,estado'])
                    ->whereIn('id', collect($data['items'])->pluck('pedido_compra_item_id')->filter())
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');
                $prendas = PedidoAutomaticoItem::with(['inventario', 'pedido.contrato:id,empresa'])
                    ->whereIn('id', collect($data['items'])->pluck('pedido_automatico_item_id')->filter())
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                $subtotalOrden = 0;
                $ivaTotalOrden = 0;
                $itemsParaCrear = [];

                foreach ($data['items'] as $itemData) {
                    $origen = !empty($itemData['pedido_automatico_item_id'])
                        ? $this->lineaDePrenda($prendas->get($itemData['pedido_automatico_item_id']))
                        : $this->lineaDeProducto($pedidoItems->get($itemData['pedido_compra_item_id']));

                    $cantidad = $origen['cantidad'];
                    // Subtotal al centavo; el IVA se sigue redondeando al peso.
                    $subtotal = round($cantidad * (float) $itemData['precio_unitario'], 2);
                    $ivaValor = (int) round($subtotal * $itemData['iva_porcentaje'] / 100);

                    $subtotalOrden += $subtotal;
                    $ivaTotalOrden += $ivaValor;

                    $itemsParaCrear[] = $origen + [
                        'precio_unitario'       => $itemData['precio_unitario'],
                        'iva_porcentaje'        => $itemData['iva_porcentaje'],
                        'subtotal'              => $subtotal,
                        'iva_valor'             => $ivaValor,
                        'total'                 => round($subtotal + $ivaValor, 2),
                    ];
                }

                $valorTransporte = round((float) ($data['valor_transporte'] ?? 0), 2);
                $subtotalOrden = round($subtotalOrden, 2);

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
                    'valor_total'      => round($subtotalOrden + $ivaTotalOrden + $valorTransporte, 2),
                    'estado'           => 'Creada',
                    'creado_por'       => $request->user()?->name ?? 'Sistema',
                ]);

                $orden->items()->createMany($itemsParaCrear);

                PedidoCompraItem::whereIn('id', $pedidoItems->keys())->update(['orden_compra_id' => $orden->id]);
                PedidoAutomaticoItem::whereIn('id', $prendas->keys())->update(['orden_compra_id' => $orden->id]);

                return response()->json($orden->fresh()->load(['sede:id,nombre', 'empresa:id,nombre', 'proveedor:id,nit,nombre,naturaleza', 'formaPago:id,nombre', 'items.empresa:id,nombre']), 201);
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /** Los datos de un producto de oficina en la orden. Falla si ya no se puede comprar. */
    private function lineaDeProducto(?PedidoCompraItem $item): array
    {
        if (!$item) {
            throw new \InvalidArgumentException('Uno de los productos elegidos ya no existe.');
        }
        if ($item->estado_revision !== 'Enviado a Compras' || $item->orden_compra_id || $item->pedido?->estado !== 'Enviado a compras') {
            throw new \InvalidArgumentException("El producto \"{$item->producto}\" ya no está disponible para comprar (puede que otra orden ya lo haya tomado o que su pedido ya no esté en Compras).");
        }

        return [
            'pedido_compra_item_id' => $item->id,
            'tipo_producto_id'      => $item->tipo_producto_id,
            'producto'              => $item->tipoProducto?->nombre ?? $item->producto,
            'categoria'             => $item->tipoProducto?->categoria,
            'empresa_id'            => $item->pedido?->empresa_id,
            'cantidad'              => $item->cantidad,
        ];
    }

    /** Los datos de una prenda de dotación en la orden. Falla si ya no se puede comprar. */
    private function lineaDePrenda(?PedidoAutomaticoItem $linea): array
    {
        if (!$linea) {
            throw new \InvalidArgumentException('Una de las prendas elegidas ya no existe.');
        }
        $pedido = $linea->pedido;
        if ($linea->cantidad_por_comprar < 1 || $linea->orden_compra_id || $pedido?->estado !== PedidoAutomatico::ENVIAR_A_COMPRAS || !$pedido->recibido_pedidos) {
            throw new \InvalidArgumentException("La prenda \"{$this->nombrePrenda($linea)}\" ya no está disponible para comprar (puede que otra orden ya la haya tomado o que su pedido ya no esté en Compras).");
        }

        return [
            'pedido_automatico_id'   => $pedido->id,
            'inventario_dotacion_id' => $linea->inventario_dotacion_id,
            'producto'               => $this->nombrePrenda($linea),
            'categoria'              => OrdenCompraItem::CATEGORIA_DOTACION,
            'empresa_id'             => $pedido->contrato?->empresa
                ? Empresa::whereRaw('UPPER(nombre) = ?', [mb_strtoupper($pedido->contrato->empresa, 'UTF-8')])->value('id')
                : null,
            'cantidad'               => $linea->cantidad_por_comprar,
        ];
    }

    /**
     * La compra ya se hizo: la orden queda completada, sus pedidos pasan a "Completada" cuando no
     * les falta nada más por comprar en otra orden, y se devuelven los datos del Excel. Solo aplica
     * a órdenes con dotación: las de oficina no tienen este paso.
     */
    public function completar(OrdenCompra $ordenCompra)
    {
        try {
            DB::transaction(function () use ($ordenCompra) {
                $orden = OrdenCompra::lockForUpdate()->findOrFail($ordenCompra->id);
                $dotacion = $orden->items()->whereNotNull('inventario_dotacion_id')->get();

                if ($dotacion->isEmpty()) {
                    throw new \InvalidArgumentException('Esta orden no tiene prendas de dotación: no hay nada que completar.');
                }
                if ($orden->estado === OrdenCompra::COMPLETADA) {
                    throw new \InvalidArgumentException("La orden {$orden->codigo} ya está completada.");
                }

                $orden->update(['estado' => OrdenCompra::COMPLETADA]);

                $pedidos = PedidoAutomatico::whereIn('id', $dotacion->pluck('pedido_automatico_id')->filter()->unique())
                    ->where('estado', PedidoAutomatico::ENVIAR_A_COMPRAS)
                    ->where('recibido_pedidos', true)
                    ->get();
                foreach ($pedidos as $pedido) {
                    $faltaOtraCompra = $pedido->items()->where('cantidad_por_comprar', '>', 0)
                        ->where(fn ($q) => $q->whereNull('orden_compra_id')
                            ->orWhereIn('orden_compra_id', OrdenCompra::where('estado', '!=', OrdenCompra::COMPLETADA)->select('id')))
                        ->exists();
                    if (!$faltaOtraCompra) {
                        $pedido->update(['estado_compra' => 'Completada']);
                    }
                }
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($this->datosExcel($ordenCompra) + [
            'orden' => $ordenCompra->fresh()->load(['sede:id,nombre', 'empresa:id,nombre', 'proveedor:id,nit,nombre,naturaleza', 'formaPago:id,nombre', 'items.empresa:id,nombre']),
        ]);
    }

    /** Los datos del Excel de una orden completada, para volver a descargarlo. */
    public function excelDotacion(OrdenCompra $ordenCompra)
    {
        return response()->json($this->datosExcel($ordenCompra));
    }

    /**
     * Una fila por prenda de la orden, con lo que aún falta recibir: así un Excel descargado de
     * nuevo no vuelve a sumar lo que ya se importó. "sin_pedido" son las prendas compradas cuyo
     * pedido ya no las tiene (se canceló, se eliminó o cambió de proyecto): no se asignan a nadie.
     */
    private function datosExcel(OrdenCompra $orden): array
    {
        $filas = [];
        $sinPedido = [];

        $items = $orden->items()->with(['pedidoAutomatico', 'inventarioDotacion.sede:id,nombre'])
            ->whereNotNull('inventario_dotacion_id')
            ->get();

        foreach ($items as $item) {
            $inv = $item->inventarioDotacion;
            $linea = $item->pedidoAutomatico?->items()->where('inventario_dotacion_id', $inv->id)->first();
            if (!$linea) {
                $sinPedido[] = $item->producto;
                continue;
            }

            $pendiente = min($item->cantidad, $linea->cantidad_por_comprar);
            if ($pendiente > 0) {
                $filas[] = [
                    'pedido'   => $item->pedidoAutomatico->codigo,
                    'proyecto' => $inv->proyecto,
                    'sede'     => $inv->sede?->nombre ?? '',
                    'prenda'   => $inv->prenda,
                    'genero'   => $inv->genero,
                    'talla'    => $inv->talla,
                    'cantidad' => $pendiente,
                ];
            }
        }

        return ['filas' => $filas, 'sin_pedido' => $sinPedido];
    }

    /**
     * Elimina la orden y libera lo que tiene: vuelve a aparecer como pendiente en el panel de
     * "Tipo de Elementos Pendientes en Pedidos" para poder incluirlo en otra orden. Una orden con
     * prendas ya importadas no se elimina: esa compra ya entró al inventario.
     */
    public function destroy(OrdenCompra $ordenCompra)
    {
        $dotacion = $ordenCompra->items()->whereNotNull('pedido_automatico_id')->with('pedidoAutomatico')->get();

        $yaImportada = $dotacion->contains(function (OrdenCompraItem $item) {
            $linea = $item->pedidoAutomatico?->items()->where('inventario_dotacion_id', $item->inventario_dotacion_id)->first();

            return $linea && $linea->cantidad_por_comprar < $item->cantidad;
        });
        if ($yaImportada) {
            return response()->json(['message' => "La orden {$ordenCompra->codigo} ya tiene prendas importadas al inventario: no se puede eliminar."], 422);
        }

        DB::transaction(function () use ($ordenCompra, $dotacion) {
            PedidoCompraItem::where('orden_compra_id', $ordenCompra->id)->update(['orden_compra_id' => null]);
            PedidoAutomaticoItem::where('orden_compra_id', $ordenCompra->id)->update(['orden_compra_id' => null]);
            PedidoAutomatico::whereIn('id', $dotacion->pluck('pedido_automatico_id'))
                ->where('estado_compra', 'Completada')
                ->update(['estado_compra' => 'Pendiente Aprobación']);
            $ordenCompra->delete();
        });

        return response()->json(null, 204);
    }
}
