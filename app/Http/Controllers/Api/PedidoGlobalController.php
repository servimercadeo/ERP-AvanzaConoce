<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ActaEntregaDotacionMail;
use App\Models\PedidoAutomatico;
use App\Models\PedidoGlobal;
use App\Models\Regional;
use App\Models\RespuestaIngreso;
use App\Models\User;
use App\Services\ActaEntregaDotacionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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

        $seAcabaDeConfirmarEntrega = ($data['entrega_confirmada'] ?? false) && !$pedidoGlobal->entrega_confirmada;

        if (array_key_exists('confirmado', $data) && $data['confirmado'] !== $pedidoGlobal->confirmado) {
            $data['confirmado_at'] = $data['confirmado'] ? now() : null;
        }

        if (array_key_exists('entrega_confirmada', $data) && $data['entrega_confirmada'] !== $pedidoGlobal->entrega_confirmada) {
            $data['entrega_confirmada_at'] = $data['entrega_confirmada'] ? now() : null;
        }

        $pedidoGlobal->update($data);

        $fresh = collect([$pedidoGlobal->fresh()->load([
            'regional',
            'pedidosAutomaticos.empleado.empresa',
            'pedidosAutomaticos.contrato',
            'pedidosAutomaticos.items.inventario',
        ])]);
        $this->resolverFotografias($fresh);

        $actasEntrega = null;
        if ($seAcabaDeConfirmarEntrega) {
            $actasEntrega = $this->enviarActasEntrega($fresh->first(), $request->user()?->name ?: 'Sistema');
        }

        $respuesta = $fresh->first()->toArray();
        if ($actasEntrega !== null) {
            $respuesta['actas_entrega'] = $actasEntrega;
        }

        return response()->json($respuesta);
    }

    /**
     * Al confirmar la ENTREGA de un pedido global (no al confirmar el pedido), envía por
     * correo a cada empleado incluido su acta de entrega de dotación en PDF (una por pedido
     * automático, con solo sus propias prendas). Un fallo puntual (correo inválido, SMTP
     * caído) no debe impedir que la entrega quede confirmada, pero sí debe quedar visible
     * para quien confirmó: antes esto solo se logueaba en storage/logs/laravel.log, invisible
     * para cualquiera sin acceso al servidor, así que ahora se devuelve un resumen
     * (enviadas/omitidas/fallidas con motivo) para que el frontend lo muestre.
     */
    private function enviarActasEntrega(PedidoGlobal $global, string $creadoPor): array
    {
        $service = app(ActaEntregaDotacionService::class);
        $resumen = ['enviadas' => [], 'omitidas' => [], 'fallidas' => []];

        foreach ($global->pedidosAutomaticos as $pedido) {
            if (!$pedido->codigo || $pedido->items->isEmpty()) {
                continue;
            }

            $empleado = $pedido->empleado;
            $nombreEmpleado = $empleado
                ? trim("{$empleado->nombres} {$empleado->apellidos}") ?: $empleado->name
                : '—';
            $correo = $this->resolverEmailReal($empleado);

            if (!$empleado || !$correo) {
                $motivo = "El empleado del pedido {$pedido->codigo} no tiene correo real registrado.";
                Log::warning("Acta de dotación no enviada: {$motivo}");
                $resumen['omitidas'][] = ['codigo' => $pedido->codigo, 'empleado' => $nombreEmpleado, 'motivo' => 'Sin correo real registrado'];
                continue;
            }

            try {
                $pdf = $service->generar($pedido, $creadoPor);
                Mail::to($correo)->send(new ActaEntregaDotacionMail(
                    $nombreEmpleado,
                    $pedido->codigo,
                    $service->resolverEmpresa($pedido),
                    $pdf,
                ));
                $resumen['enviadas'][] = ['codigo' => $pedido->codigo, 'empleado' => $nombreEmpleado, 'correo' => $correo];
            } catch (\Throwable $e) {
                Log::error("No se pudo enviar el acta de dotación del pedido {$pedido->codigo}: " . $e->getMessage());
                $resumen['fallidas'][] = ['codigo' => $pedido->codigo, 'empleado' => $nombreEmpleado, 'motivo' => $e->getMessage()];
            }
        }

        return $resumen;
    }

    /**
     * users.email suele quedar con el correo autogenerado "{cedula}@avanzaconoce.com" cuando
     * no se registró un correo real al crear el contrato (ver ContratoController::store). En
     * ese caso, igual que hace EmpleadoController::index() para mostrarlo en el listado, se
     * busca el correo real en respuestas_ingresos / candidatos. Si tampoco existe ahí, se
     * devuelve null en vez del placeholder (no es una casilla real, no tiene sentido enviarle).
     */
    private function resolverEmailReal(?User $empleado): ?string
    {
        if (!$empleado || !$empleado->email) {
            return null;
        }

        $cedula = $empleado->cedula ?? '';
        if (!$cedula || !str_starts_with($empleado->email, $cedula . '@')) {
            return $empleado->email;
        }

        return RespuestaIngreso::where('documento', $cedula)->value('correo')
            ?? DB::table('candidatos')->where('identificacion', $cedula)->value('correo');
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
