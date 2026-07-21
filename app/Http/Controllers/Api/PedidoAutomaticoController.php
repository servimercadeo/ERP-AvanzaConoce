<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PedidoAutomatico;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PedidoAutomaticoController extends Controller
{
    public function index(Request $request)
    {
        $query = PedidoAutomatico::with(['empleado', 'contrato', 'items.inventario'])
            ->whereNotNull('codigo');

        if ($request->search) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('codigo', 'like', "%$s%")
                  ->orWhereHas('empleado', function ($inner) use ($s) {
                      $inner->where('nombres', 'like', "%$s%")
                            ->orWhere('apellidos', 'like', "%$s%")
                            ->orWhere('cedula', 'like', "%$s%");
                  });
            });
        }

        if ($request->estado && $request->estado !== 'Todos') {
            $query->where('estado', $request->estado);
        }

        return response()->json($query->orderBy('id', 'desc')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'empleado_id'  => 'required|exists:users,id',
            'contrato_id'  => 'nullable|exists:contratos,id',
            'estado'       => 'nullable|string',
            'fecha_pedido' => 'nullable|date',
            'notas'        => 'nullable|string',
            'codigo'       => 'nullable|string|max:10|unique:pedidos_automaticos,codigo',
            'items'        => 'nullable|array',
            'items.*.inventario_dotacion_id' => 'required|exists:inventario_dotacion,id',
            'items.*.cantidad'               => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($data) {
            $data['codigo']       = $data['codigo'] ?? PedidoAutomatico::generarCodigo();
            $data['estado']       = $data['estado'] ?? 'Activo';
            $data['fecha_pedido'] = $data['fecha_pedido'] ?? now()->toDateString();

            $pedido = PedidoAutomatico::create($data);

            if (!empty($data['items'])) {
                if ($data['estado'] === 'Activo') {
                    $pedido->asignarItems($data['items']);
                } else {
                    $this->guardarItemsSinDescontar($pedido, $data['items']);
                }
            }

            return response()->json(
                $pedido->load(['empleado', 'contrato', 'items.inventario']),
                201
            );
        });
    }

    public function show(PedidoAutomatico $pedidoAutomatico)
    {
        return response()->json(
            $pedidoAutomatico->load(['empleado', 'contrato', 'items.inventario'])
        );
    }

    public function update(Request $request, PedidoAutomatico $pedidoAutomatico)
    {
        $data = $request->validate([
            'empleado_id'  => 'required|exists:users,id',
            'contrato_id'  => 'nullable|exists:contratos,id',
            'estado'       => 'nullable|string',
            'fecha_pedido' => 'nullable|date',
            'notas'        => 'nullable|string',
            'items'        => 'nullable|array',
            'items.*.inventario_dotacion_id' => 'required|exists:inventario_dotacion,id',
            'items.*.cantidad'               => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($data, $pedidoAutomatico) {
            $estadoAnterior = $pedidoAutomatico->estado;
            $nuevoEstado    = $data['estado'] ?? $estadoAnterior;

            if ($estadoAnterior === 'Activo' && $nuevoEstado === 'Cancelado') {
                // Restaurar todo el inventario y limpiar items
                $this->restaurarInventario($pedidoAutomatico);
                $pedidoAutomatico->items()->delete();

            } elseif ($estadoAnterior === 'Activo' && $nuevoEstado === 'Activo') {
                // Edición de items activos: restaurar anteriores y descontar nuevos
                $this->restaurarInventario($pedidoAutomatico);
                $pedidoAutomatico->items()->delete();
                if (!empty($data['items'])) {
                    $pedidoAutomatico->asignarItems($data['items']);
                }

            } elseif ($estadoAnterior === 'Pendiente' && $nuevoEstado === 'Activo') {
                // Primera activación: descontar items del payload
                $pedidoAutomatico->items()->delete();
                if (!empty($data['items'])) {
                    $pedidoAutomatico->asignarItems($data['items']);
                }

            } elseif ($estadoAnterior === 'Pendiente' && $nuevoEstado === 'Pendiente') {
                // Edición sin activar: guardar items sin tocar inventario
                $pedidoAutomatico->items()->delete();
                if (!empty($data['items'])) {
                    $this->guardarItemsSinDescontar($pedidoAutomatico, $data['items']);
                }

            } elseif ($estadoAnterior === 'Pendiente' && $nuevoEstado === 'Cancelado') {
                // Cancelar antes de activar: solo limpiar items (inventario nunca fue descontado)
                $pedidoAutomatico->items()->delete();

            } elseif ($estadoAnterior === 'Completado' && $nuevoEstado === 'Cancelado') {
                // Revertir un pedido completado: restaurar inventario y desvincular del global
                $this->restaurarInventario($pedidoAutomatico);
                $pedidoAutomatico->items()->delete();
                $data['pedido_global_id'] = null;
            }

            $pedidoAutomatico->update($data);

            return response()->json(
                $pedidoAutomatico->load(['empleado', 'contrato', 'items.inventario'])
            );
        });
    }

    public function ultimoPorEmpleado(int $empleadoId)
    {
        // Sirve solo como referencia de historial para pre-cargar un pedido nuevo
        // (no se vincula ni se modifica el pedido encontrado), así que no importa
        // en qué estado esté: se toma siempre el más reciente del empleado.
        $pedido = PedidoAutomatico::with(['items.inventario'])
            ->where('empleado_id', $empleadoId)
            ->orderBy('id', 'desc')
            ->first();

        if (!$pedido) {
            return response()->json(null);
        }

        return response()->json([
            'codigo'      => $pedido->codigo,
            'fecha_pedido'=> $pedido->fecha_pedido,
            'estado'      => $pedido->estado,
            'items'       => $pedido->items->map(fn($it) => [
                'inventario_dotacion_id' => $it->inventario_dotacion_id,
                'cantidad'               => $it->cantidad,
                'inventario'             => $it->inventario,
            ])->values(),
        ]);
    }

    public function devolver(PedidoAutomatico $pedidoAutomatico)
    {
        if ($pedidoAutomatico->estado === 'Devolución') {
            return response()->json(['message' => 'El pedido ya está en estado Devolución.'], 422);
        }

        if (!in_array($pedidoAutomatico->estado, ['Completado'])) {
            return response()->json(['message' => 'Solo se pueden devolver pedidos en estado Completado.'], 422);
        }

        return DB::transaction(function () use ($pedidoAutomatico) {
            $this->restaurarInventario($pedidoAutomatico);
            $pedidoAutomatico->update(['estado' => 'Devolución']);

            $pedidoAutomatico->load(['empleado', 'contrato', 'items.inventario']);

            $emp = $pedidoAutomatico->empleado;
            if ($emp && !$emp->fotografia) {
                $emp->fotografia = DB::table('candidatos')
                    ->where('identificacion', $emp->cedula)
                    ->value('fotografia');
            }

            return response()->json($pedidoAutomatico);
        });
    }

    public function bulkEstado(Request $request)
    {
        $data = $request->validate([
            'ids'          => 'required|array|min:1',
            'ids.*'        => 'integer|exists:pedidos_automaticos,id',
            'estado'       => 'required|string|in:Activo,Para ventas,Devolución,Devolución usada',
        ]);

        return DB::transaction(function () use ($data) {
            $pedidos = PedidoAutomatico::whereIn('id', $data['ids'])
                ->lockForUpdate()
                ->get();

            foreach ($pedidos as $pedido) {
                if ($data['estado'] === 'Devolución' && $pedido->estado !== 'Devolución') {
                    $this->restaurarInventario($pedido);
                }
                $pedido->update(['estado' => $data['estado']]);
            }

            return response()->json(
                PedidoAutomatico::whereIn('id', $data['ids'])
                    ->with(['empleado', 'contrato', 'items.inventario'])
                    ->get()
            );
        });
    }

    public function destroy(PedidoAutomatico $pedidoAutomatico)
    {
        return DB::transaction(function () use ($pedidoAutomatico) {
            if (in_array($pedidoAutomatico->estado, ['Activo', 'Completado'])) {
                $this->restaurarInventario($pedidoAutomatico);
            }
            $pedidoAutomatico->delete();
            return response()->json(null, 204);
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function guardarItemsSinDescontar(PedidoAutomatico $pedido, array $items): void
    {
        foreach ($items as $item) {
            $pedido->items()->create([
                'inventario_dotacion_id' => $item['inventario_dotacion_id'],
                'cantidad'               => $item['cantidad'],
            ]);
        }
    }

    private function restaurarInventario(PedidoAutomatico $pedido): void
    {
        foreach ($pedido->items()->with('inventario')->get() as $item) {
            if ($item->inventario) {
                $item->inventario->increment('cantidad', $item->cantidad);
            }
        }
    }
}
