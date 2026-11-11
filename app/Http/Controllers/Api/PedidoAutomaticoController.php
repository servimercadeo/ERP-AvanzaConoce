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
        // sedeCatalogo: el nombre de la sede de empleado y contrato sale del catálogo
        // (HasSedeCatalogo); precargado, no es una consulta por pedido.
        $query = PedidoAutomatico::with(['empleado.sedeCatalogo', 'contrato.sedeCatalogo', 'items.inventario.sede:id,nombre', 'sede:id,nombre'])
            ->whereNotNull('codigo')
            // Un aliado (o técnico de aliado) no ve la dotación de la empresa: solo la suya.
            ->when(\App\Models\PedidoCompra::aliadoDe($request->user()), fn ($q) => $q->where('empleado_id', $request->user()->id));

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
            'sede_id'      => 'required|exists:sedes,id',
            'items'        => 'nullable|array',
            'items.*.inventario_dotacion_id' => 'required|exists:inventario_dotacion,id',
            'items.*.cantidad'               => 'required|integer|min:1',
        ]);
        if (($data['estado'] ?? null) === PedidoAutomatico::ENVIAR_A_COMPRAS) {
            return response()->json(['message' => PedidoAutomatico::SOLO_DESDE_GLOBAL], 422);
        }
        if (!\App\Models\Contrato::where('empleado_id', $data['empleado_id'])->exists()) {
            return response()->json(['message' => 'El empleado no tiene contrato: no se le puede crear un pedido de dotación.'], 422);
        }
        $contrato = $this->contratoDelPedido($data);
        if ($msg = PedidoAutomatico::prendasDeOtroProyecto($contrato, $data['items'] ?? [])) {
            return response()->json(['message' => $msg], 422);
        }
        if ($msg = $this->prendasDeOtraSede((int) $data['sede_id'], $data['items'] ?? [])) {
            return response()->json(['message' => $msg, 'errors' => ['sede_id' => [$msg]]], 422);
        }
        // Sin contrato ligado el pedido no se puede revisar en Compras (la sede pedida sale de
        // ahí) ni agrupar en un pedido global.
        $data['contrato_id'] = $contrato?->id;

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
                    $pedido->load(['empleado', 'contrato', 'items.inventario', 'sede:id,nombre']),
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
            $pedidoAutomatico->load(['empleado', 'contrato', 'items.inventario', 'sede:id,nombre'])
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
            'sede_id'      => 'sometimes|nullable|exists:sedes,id',
            'items'        => 'nullable|array',
            'items.*.inventario_dotacion_id' => 'required|exists:inventario_dotacion,id',
            'items.*.cantidad'               => 'required|integer|min:1',
        ]);

        if (($data['estado'] ?? null) === PedidoAutomatico::ENVIAR_A_COMPRAS && $pedidoAutomatico->estado !== PedidoAutomatico::ENVIAR_A_COMPRAS) {
            return response()->json(['message' => PedidoAutomatico::SOLO_DESDE_GLOBAL], 422);
        }
        if ($msg = PedidoAutomatico::prendasDeOtroProyecto($this->contratoDelPedido($data), $data['items'] ?? [])) {
            return response()->json(['message' => $msg], 422);
        }
        // Las prendas que se agregan salen de la sede del pedido; las que ya tenía se respetan
        // (un pedido automático puede traer el carnet del inventario administrativo).
        $sedeId = array_key_exists('sede_id', $data) ? $data['sede_id'] : $pedidoAutomatico->sede_id;
        $yaTenia = $pedidoAutomatico->items()->pluck('inventario_dotacion_id')->all();
        $nuevas = array_filter($data['items'] ?? [], fn ($i) => !in_array($i['inventario_dotacion_id'], $yaTenia));
        if ($sedeId && ($msg = $this->prendasDeOtraSede((int) $sedeId, $nuevas))) {
            return response()->json(['message' => $msg, 'errors' => ['sede_id' => [$msg]]], 422);
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
                    $pedidoAutomatico->load(['empleado', 'contrato', 'items.inventario', 'sede:id,nombre'])
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

            $pedidoAutomatico->load(['empleado', 'contrato', 'items.inventario', 'sede:id,nombre']);

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
                $pedido->exigirGlobalParaCompras($data['estado']);
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

    /** Mensaje si alguna prenda no es del inventario de esa sede, o null si todas lo son. */
    private function prendasDeOtraSede(int $sedeId, array $items): ?string
    {
        $ajenas = \App\Models\InventarioDotacion::with('sede:id,nombre')
            ->whereIn('id', array_column($items, 'inventario_dotacion_id'))
            ->where('sede_id', '!=', $sedeId)
            // La dotación administrativa (carnet de oficina) sale siempre de la sede central.
            ->where('proyecto', '!=', 'SYM ADMINISTRATIVO')
            ->get();
        if ($ajenas->isEmpty()) {
            return null;
        }
        $sede = \App\Models\Sede::whereKey($sedeId)->value('nombre');

        return "Las prendas salen del inventario de la sede {$sede}. No son de esa sede: "
            . $ajenas->map(fn ($i) => "{$i->prenda} {$i->talla} ({$i->sede?->nombre})")->implode(', ') . '.';
    }

    private function contratoDelPedido(array $data): ?\App\Models\Contrato
    {
        return PedidoAutomatico::contratoDelEmpleado((int) $data['empleado_id'], !empty($data['contrato_id']) ? (int) $data['contrato_id'] : null);
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
