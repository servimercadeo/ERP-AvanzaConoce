<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PedidoAutomatico;
use App\Models\PedidoGlobal;
use App\Models\Regional;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PedidoGlobalController extends Controller
{
    // Los pedidos automáticos son mayormente de personal nuevo, que siempre
    // sale de esta regional: al generar un pedido global desde ellos ya no
    // se pide seleccionar regional, se asume esta por defecto.
    private const REGIONAL_PEDIDOS_AUTOMATICOS = 'EJE CAFETERO';

    private function regionalPedidosAutomaticosId(): int
    {
        $id = Regional::where('nombre', self::REGIONAL_PEDIDOS_AUTOMATICOS)->value('id');

        if (!$id) {
            abort(422, 'No se encontró la regional "' . self::REGIONAL_PEDIDOS_AUTOMATICOS . '".');
        }

        return $id;
    }

    public function index()
    {
        $globales = PedidoGlobal::with([
            'regional',
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
            'fecha'              => 'nullable|date',
            'notas'              => 'nullable|string',
            'confirmado'         => 'nullable|boolean',
            'entrega_confirmada' => 'nullable|boolean',
        ]);

        if (($data['entrega_confirmada'] ?? false) && !$pedidoGlobal->entrega_confirmada) {
            if (!$pedidoGlobal->confirmado && !($data['confirmado'] ?? false)) {
                return response()->json([
                    'message' => 'Primero debes confirmar el pedido antes de confirmar la entrega.',
                ], 422);
            }
        }

        if (array_key_exists('confirmado', $data) && $data['confirmado'] !== $pedidoGlobal->confirmado) {
            $data['confirmado_at'] = $data['confirmado'] ? now() : null;
        }

        if (array_key_exists('entrega_confirmada', $data) && $data['entrega_confirmada'] !== $pedidoGlobal->entrega_confirmada) {
            $data['entrega_confirmada_at'] = $data['entrega_confirmada'] ? now() : null;
        }

        $pedidoGlobal->update($data);

        $fresh = collect([$pedidoGlobal->fresh()->load([
            'regional',
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
            'notas'       => 'nullable|string',
            'proyecto'    => 'required|string',
            'regional_id' => 'nullable|exists:regionales,id',
        ]);

        $regionalId = $data['regional_id'] ?? $this->regionalPedidosAutomaticosId();
        $regionalNombre = Regional::find($regionalId)->nombre;

        return DB::transaction(function () use ($data, $regionalId, $regionalNombre) {
            $pedidos = PedidoAutomatico::where('estado', 'Activo')
                ->whereNull('pedido_global_id')
                ->whereNotNull('codigo')
                ->whereHas('contrato', function ($q) use ($data, $regionalId) {
                    $q->where('cliente_proyecto', $data['proyecto'])
                      ->where('regional_id', $regionalId);
                })
                ->lockForUpdate()
                ->get();

            if ($pedidos->isEmpty()) {
                return response()->json([
                    'message' => 'No hay pedidos en proceso para el proyecto seleccionado en la regional ' . $regionalNombre . '.',
                ], 422);
            }

            $global = PedidoGlobal::create([
                'codigo'           => PedidoGlobal::generarCodigo(),
                'fecha'            => now()->toDateString(),
                'total_pedidos'    => $pedidos->count(),
                'notas'            => $data['notas'] ?? null,
                'cliente_proyecto' => $data['proyecto'],
                'regional_id'      => $regionalId,
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

    public function import(Request $request)
    {
        $data = $request->validate([
            'fecha'                                      => 'nullable|date',
            'notas'                                       => 'nullable|string',
            'proyecto'                                    => 'required|string',
            'regional_id'                                 => 'required|exists:regionales,id',
            'pedidos'                                      => 'required|array|min:1',
            'pedidos.*.codigo'                             => 'nullable|string|max:10',
            'pedidos.*.empleado_id'                        => 'required|exists:users,id',
            'pedidos.*.contrato_id'                        => 'nullable|exists:contratos,id',
            'pedidos.*.fecha_pedido'                       => 'nullable|date',
            'pedidos.*.notas'                              => 'nullable|string',
            'pedidos.*.items'                              => 'required|array|min:1',
            'pedidos.*.items.*.inventario_dotacion_id'     => 'required|exists:inventario_dotacion,id',
            'pedidos.*.items.*.cantidad'                   => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($data) {
            $global = PedidoGlobal::create([
                'codigo'           => PedidoGlobal::generarCodigo(),
                'fecha'            => $data['fecha'] ?? now()->toDateString(),
                'cliente_proyecto' => $data['proyecto'],
                'regional_id'      => $data['regional_id'],
                'notas'            => $data['notas'] ?? null,
                'total_pedidos'    => count($data['pedidos']),
            ]);

            foreach ($data['pedidos'] as $p) {
                $existente = !empty($p['codigo'])
                    ? PedidoAutomatico::where('codigo', $p['codigo'])->lockForUpdate()->first()
                    : null;

                if ($existente) {
                    if ($existente->pedido_global_id) {
                        throw new InvalidArgumentException(
                            "El pedido #{$existente->codigo} ya pertenece a otro pedido global."
                        );
                    }
                    if ($existente->estado !== 'Activo') {
                        throw new InvalidArgumentException(
                            "El pedido #{$existente->codigo} está en estado \"{$existente->estado}\" y no se puede incluir en un pedido global."
                        );
                    }
                    // Ya existe y su inventario ya fue descontado al crearlo: solo se vincula al global.
                    $existente->update([
                        'pedido_global_id' => $global->id,
                        'estado'           => 'Completado',
                    ]);
                    continue;
                }

                $pedido = PedidoAutomatico::create([
                    'codigo'           => $p['codigo'] ?: PedidoAutomatico::generarCodigo(),
                    'empleado_id'      => $p['empleado_id'],
                    'contrato_id'      => $p['contrato_id'] ?? null,
                    'estado'           => 'Completado',
                    'fecha_pedido'     => $p['fecha_pedido'] ?? now()->toDateString(),
                    'notas'            => $p['notas'] ?? null,
                    'pedido_global_id' => $global->id,
                ]);

                $pedido->asignarItems($p['items']);
            }

            $fresh = collect([$global->fresh()->load([
                'regional',
                'pedidosAutomaticos.empleado',
                'pedidosAutomaticos.contrato',
                'pedidosAutomaticos.items.inventario',
            ])]);
            $this->resolverFotografias($fresh);

            return response()->json($fresh->first(), 201);
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
