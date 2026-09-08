<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PedidoCompra;
use App\Models\TipoProducto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PedidoCompraController extends Controller
{
    public function index()
    {
        return response()->json(
            PedidoCompra::with('items')->orderBy('id', 'desc')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'tipo_responsable'         => 'required|in:Empleado,Aliado',
            'responsable'              => 'required|string|max:150',
            'sede'                     => 'required|string|max:150',
            'clase'                    => 'required|string|max:150',
            'concepto'                 => 'required|string|max:150',
            'estado'                   => 'nullable|string|max:50',
            'estado_compra'            => 'nullable|string|max:50',
            'items'                    => 'required|array|min:1',
            'items.*.tipo_producto_id' => 'required|exists:tipos_producto,id',
            'items.*.cantidad'         => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($data, $request) {
            $pedido = PedidoCompra::create([
                'codigo'           => PedidoCompra::generarCodigo(),
                'fecha_registro'   => now()->toDateString(),
                'tipo_responsable' => $data['tipo_responsable'],
                'responsable'      => $data['responsable'],
                'sede'             => $data['sede'],
                'clase'            => $data['clase'],
                'concepto'         => $data['concepto'],
                'estado'           => $data['estado'] ?? 'Pendiente Aprobación',
                'estado_compra'    => $data['estado_compra'] ?? null,
                'registra'         => $request->user()?->name ?? 'Sistema',
            ]);

            $pedido->items()->createMany($this->resolverItems($data['items']));

            return response()->json($pedido->load('items'), 201);
        });
    }

    public function show(PedidoCompra $pedidoCompra)
    {
        return response()->json($pedidoCompra->load('items'));
    }

    /**
     * Todos los campos son opcionales aquí a propósito: la tabla de Pedidos usa
     * este mismo endpoint para actualizaciones parciales (ej. el checkbox "Enviar
     * a Compras" solo manda {estado, estado_compra}), sin tener que reenviar todo
     * el formulario ni los items cada vez.
     */
    public function update(Request $request, PedidoCompra $pedidoCompra)
    {
        $data = $request->validate([
            'tipo_responsable'         => 'sometimes|required|in:Empleado,Aliado',
            'responsable'              => 'sometimes|required|string|max:150',
            'sede'                     => 'sometimes|required|string|max:150',
            'clase'                    => 'sometimes|required|string|max:150',
            'concepto'                 => 'sometimes|required|string|max:150',
            'estado'                   => 'sometimes|nullable|string|max:50',
            'estado_compra'            => 'sometimes|nullable|string|max:50',
            'items'                    => 'sometimes|array|min:1',
            'items.*.tipo_producto_id' => 'required_with:items|exists:tipos_producto,id',
            'items.*.cantidad'         => 'required_with:items|integer|min:1',
        ]);

        // El check "Enviar a Compras" solo se puede activar cuando la revisión de
        // stock ya concluyó, para al menos una prenda, que no hay existencias en
        // ninguna sede (mismo criterio que en Dotación).
        if (($data['estado'] ?? null) === 'Enviado a compras' && $pedidoCompra->estado !== 'Enviado a compras') {
            $tieneItemParaComprar = $pedidoCompra->items()
                ->where('estado_revision', 'Enviado a Compras')
                ->exists();

            if (!$tieneItemParaComprar) {
                return response()->json([
                    'message' => 'Primero confirma, revisando cada producto, que no hay stock en ninguna sede.',
                ], 422);
            }
        }

        return DB::transaction(function () use ($data, $pedidoCompra) {
            $pedidoCompra->update(collect($data)->except('items')->all());

            if (array_key_exists('items', $data)) {
                $pedidoCompra->items()->delete();
                $pedidoCompra->items()->createMany($this->resolverItems($data['items']));
            }

            return response()->json($pedidoCompra->fresh()->load('items'));
        });
    }

    public function destroy(PedidoCompra $pedidoCompra)
    {
        $pedidoCompra->delete();
        return response()->json(null, 204);
    }

    /**
     * El nombre de producto que se guarda en el item es un snapshot resuelto en el
     * servidor a partir del catálogo real (nunca se confía en texto libre del cliente).
     */
    private function resolverItems(array $items): array
    {
        $tipos = TipoProducto::whereIn('id', array_column($items, 'tipo_producto_id'))
            ->get(['id', 'nombre'])
            ->keyBy('id');

        return array_map(fn ($item) => [
            'tipo_producto_id' => $item['tipo_producto_id'],
            'producto'         => $tipos->get($item['tipo_producto_id'])?->nombre ?? 'Producto',
            'cantidad'         => $item['cantidad'],
        ], $items);
    }
}
