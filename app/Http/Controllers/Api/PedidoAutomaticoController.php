<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventarioDotacion;
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
            'items'        => 'nullable|array',
            'items.*.inventario_dotacion_id' => 'required|exists:inventario_dotacion,id',
            'items.*.cantidad'               => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($data) {
            $data['codigo']       = PedidoAutomatico::generarCodigo();
            $data['estado']       = $data['estado'] ?? 'Activo';
            $data['fecha_pedido'] = $data['fecha_pedido'] ?? now()->toDateString();

            $pedido = PedidoAutomatico::create($data);

            if (!empty($data['items'])) {
                if ($data['estado'] === 'Activo') {
                    $this->asignarItems($pedido, $data['items']);
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
                    $this->asignarItems($pedidoAutomatico, $data['items']);
                }

            } elseif ($estadoAnterior === 'Pendiente' && $nuevoEstado === 'Activo') {
                // Primera activación: descontar items del payload
                $pedidoAutomatico->items()->delete();
                if (!empty($data['items'])) {
                    $this->asignarItems($pedidoAutomatico, $data['items']);
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
        $pedido = PedidoAutomatico::with(['items.inventario'])
            ->where('empleado_id', $empleadoId)
            ->where('estado', 'Completado')
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

    private function asignarItems(PedidoAutomatico $pedido, array $items): void
    {
        foreach ($items as $item) {
            $inv = InventarioDotacion::lockForUpdate()->findOrFail($item['inventario_dotacion_id']);

            if ($inv->cantidad < $item['cantidad']) {
                throw new \InvalidArgumentException(
                    "Stock insuficiente para {$inv->categoria} {$inv->subcategoria} {$inv->genero} T:{$inv->talla}. " .
                    "Disponible: {$inv->cantidad}, solicitado: {$item['cantidad']}."
                );
            }

            $pedido->items()->create([
                'inventario_dotacion_id' => $item['inventario_dotacion_id'],
                'cantidad'               => $item['cantidad'],
            ]);

            $inv->decrement('cantidad', $item['cantidad']);
        }
    }

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
