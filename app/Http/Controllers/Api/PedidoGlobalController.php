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
        $globales = PedidoGlobal::with([
            'pedidosAutomaticos.empleado',
            'pedidosAutomaticos.contrato',
            'pedidosAutomaticos.items.inventario',
        ])
        ->orderBy('id', 'desc')
        ->get();

        $this->resolverFotografias($globales);

        return response()->json($globales);
    }

    public function update(Request $request, PedidoGlobal $pedidoGlobal)
    {
        $data = $request->validate([
            'fecha'       => 'nullable|date',
            'notas'       => 'nullable|string',
            'confirmado'  => 'nullable|boolean',
        ]);

        $pedidoGlobal->update($data);

        $fresh = collect([$pedidoGlobal->fresh()->load([
            'pedidosAutomaticos.empleado',
            'pedidosAutomaticos.contrato',
            'pedidosAutomaticos.items.inventario',
        ])]);
        $this->resolverFotografias($fresh);

        return response()->json($fresh->first());
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

    private function resolverFotografias($globales): void
    {
        foreach ($globales as $global) {
            foreach ($global->pedidosAutomaticos as $pedido) {
                $emp = $pedido->empleado;
                if ($emp && !$emp->fotografia) {
                    $emp->fotografia = DB::table('candidatos')
                        ->where('identificacion', $emp->cedula)
                        ->value('fotografia');
                }
            }
        }
    }
}
