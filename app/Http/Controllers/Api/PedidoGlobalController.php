<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PedidoAutomatico;
use App\Models\PedidoGlobal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PedidoGlobalController extends Controller
{
    public function index()
    {
        return response()->json(
            PedidoGlobal::with([
                'pedidosAutomaticos.empleado',
                'pedidosAutomaticos.items.inventario',
            ])
            ->orderBy('id', 'desc')
            ->get()
        );
    }

    public function update(Request $request, PedidoGlobal $pedidoGlobal)
    {
        $data = $request->validate([
            'fecha' => 'nullable|date',
            'notas' => 'nullable|string',
        ]);

        $pedidoGlobal->update($data);

        return response()->json($pedidoGlobal->fresh()->load([
            'pedidosAutomaticos.empleado',
            'pedidosAutomaticos.items.inventario',
        ]));
    }

    public function destroy(PedidoGlobal $pedidoGlobal)
    {
        DB::transaction(function () use ($pedidoGlobal) {
            // Revertir los pedidos automáticos a Activo y desligarlos del global
            PedidoAutomatico::where('pedido_global_id', $pedidoGlobal->id)
                ->update([
                    'pedido_global_id' => null,
                    'estado'           => 'Activo',
                ]);

            $pedidoGlobal->delete();
        });

        return response()->json(null, 204);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'notas' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($data) {
            $pedidos = PedidoAutomatico::where('estado', 'Activo')
                ->whereNull('pedido_global_id')
                ->whereNotNull('codigo')
                ->lockForUpdate()
                ->get();

            if ($pedidos->isEmpty()) {
                return response()->json([
                    'message' => 'No hay pedidos en proceso para generar un pedido global.',
                ], 422);
            }

            $global = PedidoGlobal::create([
                'codigo'        => PedidoGlobal::generarCodigo(),
                'fecha'         => now()->toDateString(),
                'total_pedidos' => $pedidos->count(),
                'notas'         => $data['notas'] ?? null,
            ]);

            PedidoAutomatico::whereIn('id', $pedidos->pluck('id'))
                ->update([
                    'pedido_global_id' => $global->id,
                    'estado'           => 'Completado',
                ]);

            return response()->json([
                'global' => $global,
                'total'  => $pedidos->count(),
            ], 201);
        });
    }
}
