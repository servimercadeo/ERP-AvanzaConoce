<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PedidoAutomatico;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

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
            'estado'       => ['nullable', 'string', \Illuminate\Validation\Rule::in(PedidoAutomatico::ESTADOS)],
            'fecha_pedido' => 'nullable|date',
            'notas'        => 'nullable|string',
            'codigo'       => 'nullable|string|max:10|unique:pedidos_automaticos,codigo',
            'items'        => 'nullable|array',
            'items.*.inventario_dotacion_id' => 'required|exists:inventario_dotacion,id',
            'items.*.cantidad'               => 'required|integer|min:1',
        ]);
        if (!\App\Models\Contrato::where('empleado_id', $data['empleado_id'])->exists()) {
            return response()->json(['message' => 'El empleado no tiene contrato: no se le puede crear un pedido de dotación.'], 422);
        }
        if ($msg = PedidoAutomatico::prendasDeOtroProyecto($this->contratoDelPedido($data), $data['items'] ?? [])) {
            return response()->json(['message' => $msg], 422);
        }

        try {
            return DB::transaction(function () use ($data) {
                $data['codigo']       = $data['codigo'] ?? PedidoAutomatico::generarCodigo();
                $data['estado']       = $data['estado'] ?? 'Activo';
                $data['fecha_pedido'] = $data['fecha_pedido'] ?? now()->toDateString();

                $pedido = PedidoAutomatico::create($data);

                if (!empty($data['items'])) {
                    if (PedidoAutomatico::descuentaStock($data['estado'])) {
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
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
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
            'estado'       => ['nullable', 'string', \Illuminate\Validation\Rule::in(PedidoAutomatico::ESTADOS)],
            'fecha_pedido' => 'nullable|date',
            'notas'        => 'nullable|string',
            'items'        => 'nullable|array',
            'items.*.inventario_dotacion_id' => 'required|exists:inventario_dotacion,id',
            'items.*.cantidad'               => 'required|integer|min:1',
        ]);

        if ($msg = PedidoAutomatico::prendasDeOtroProyecto($this->contratoDelPedido($data), $data['items'] ?? [])) {
            return response()->json(['message' => $msg], 422);
        }

        try {
            return DB::transaction(function () use ($data, $pedidoAutomatico) {
                // Estado y prendas con el inventario cuadrado (ver PedidoAutomatico::cambiarEstado).
                $pedidoAutomatico->cambiarEstado(
                    $data['estado'] ?? $pedidoAutomatico->estado,
                    array_key_exists('items', $data) ? ($data['items'] ?? []) : null,
                );
                unset($data['estado'], $data['items']);

                $pedidoAutomatico->update($data);

                return response()->json(
                    $pedidoAutomatico->load(['empleado', 'contrato', 'items.inventario'])
                );
            });
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
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

            \App\Models\User::completarFotografias([$pedidoAutomatico->empleado]);

            return response()->json($pedidoAutomatico);
        });
    }

    public function bulkEstado(Request $request)
    {
        $data = $request->validate([
            'ids'          => 'required|array|min:1',
            'ids.*'        => 'integer|exists:pedidos_automaticos,id',
            'estado'       => 'required|string|in:Activo,Enviar a compras,Devolución,Devolución usada',
        ]);

        try {
            return DB::transaction(function () use ($data) {
            $pedidos = PedidoAutomatico::whereIn('id', $data['ids'])
                ->lockForUpdate()
                ->get();

            foreach ($pedidos as $pedido) {
                $pedido->cambiarEstado($data['estado']);
            }

            return response()->json(
                PedidoAutomatico::whereIn('id', $data['ids'])
                    ->with(['empleado', 'contrato', 'items.inventario'])
                    ->get()
            );
            });
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function destroy(PedidoAutomatico $pedidoAutomatico)
    {
        return DB::transaction(function () use ($pedidoAutomatico) {
            if (in_array($pedidoAutomatico->estado, ['Activo', 'Completado', 'Enviar a compras'], true)) {
                $this->restaurarInventario($pedidoAutomatico);
            }
            $pedidoAutomatico->delete();
            return response()->json(null, 204);
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** El contrato indicado o, si no viene, el vigente del empleado (activo más reciente). */
    private function contratoDelPedido(array $data): ?\App\Models\Contrato
    {
        if (!empty($data['contrato_id'])) {
            return \App\Models\Contrato::find($data['contrato_id']);
        }

        return \App\Models\Contrato::where('empleado_id', $data['empleado_id'])
            ->orderByRaw("estado_contrato = 'Activo' DESC")
            ->orderByDesc('fecha_ingreso')->orderByDesc('id')
            ->first();
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
        $pedido->restaurarInventario();
    }
}
