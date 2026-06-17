<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidato;
use App\Models\Contrato;
use App\Models\InventarioDotacion;
use App\Models\PedidoAutomatico;
use App\Models\RespuestaIngreso;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ContratoController extends Controller
{
    private const MESES_ES = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];

    private function fechaEnEspanol($fecha): string
    {
        if (!$fecha) return '';
        $carbon = $fecha instanceof \Carbon\Carbon ? $fecha : \Carbon\Carbon::parse($fecha);
        return mb_strtoupper("{$carbon->day} DE " . self::MESES_ES[$carbon->month - 1] . " DE {$carbon->year}", 'UTF-8');
    }

    private function enviarContratoASharepoint(Contrato $contrato): void
    {
        $flowUrl = config('services.sharepoint.contrato_flow_url');
        if (!$flowUrl) return;

        $empleado = $contrato->empleado;
        $cedula   = $empleado?->cedula;
        if (!$cedula) return;

        $respuesta = RespuestaIngreso::where('documento', $cedula)->first();
        $candidato = Candidato::where('identificacion', $cedula)->first();

        $correoSuper = $contrato->jefe_inmediato
            ? DB::table('users')->where('name', $contrato->jefe_inmediato)->value('email')
            : null;

        $data = [
            'nombres'             => $respuesta?->nombres ?? $empleado->nombres ?? '',
            'apellidos'           => $respuesta?->apellidos ?? $empleado->apellidos ?? '',
            'documento'           => $cedula,
            'celular'             => $respuesta?->celular ?? $empleado->movil ?? '',
            'correo'              => $respuesta?->correo ?? $candidato?->correo ?? $empleado->email ?? '',
            'ciudad'              => $respuesta?->ciudad ?? '',
            'direccion'           => $respuesta?->direccion ?? '',
            'fecha_nacimiento'    => $respuesta?->fecha_nacimiento ?? '',
            'fecha_expedicion'    => optional($candidato?->fecha_expedicion)->format('Y-m-d') ?? '',
            'grupo_rh'            => $respuesta?->rh ?? '',
            'contacto_emergencia' => $respuesta?->emergencia_nombre ?? '',
            'parentesco'          => $respuesta?->emergencia_parentesco ?? '',
            'nro_contacto'        => $respuesta?->emergencia_telefono ?? '',
            'fec_ini_contrato'    => $this->fechaEnEspanol($contrato->fecha_ingreso),
            't_camisa'            => $respuesta?->talla_camisa ?? '',
            't_pantalon'          => $respuesta?->talla_pantalon ?? '',
            't_zapatos'           => $respuesta?->talla_zapatos ?? '',
            'CorreoSuper'         => $correoSuper ?? '',
            'Departamento'        => $contrato->area_empresa ?? '',
        ];

        try {
            Http::timeout(15)->post($flowUrl, $data);
        } catch (\Exception $e) {
            Log::warning('No se pudo enviar el contrato a SharePoint para cédula ' . $cedula . ': ' . $e->getMessage());
        }
    }

    public function index(Request $request)
    {
        $query = Contrato::with(['empleado', 'centrosCostos', 'anexos']);

        // Anulados solo se muestran cuando se filtra explícitamente por ese estado
        if ($request->estado === 'Contrato anulado') {
            $query->where('completado', false);
        } else {
            $query->where('completado', true);
        }

        if ($request->search) {
            $s = $request->search;
            $query->whereHas('empleado', function($q) use ($s) {
                $q->where('name', 'like', "%$s%")
                  ->orWhere('nombres', 'like', "%$s%")
                  ->orWhere('apellidos', 'like', "%$s%")
                  ->orWhere('cedula', 'like', "%$s%");
            })->orWhere('cargo', 'like', "%$s%");
        }

        // El filtro de estado ya fue manejado arriba via completado
        if ($request->estado && $request->estado !== 'Todos' && $request->estado !== 'Contrato anulado') {
            $query->where('estado_contrato', $request->estado);
        }

        if ($request->sede && $request->sede !== 'Todas') {
            $query->where('sede', $request->sede);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        if (empty($request->empleado_id) && $request->documento) {
            $user = \App\Models\User::firstOrCreate(
                ['cedula' => $request->documento],
                [
                    'nombres' => mb_strtoupper($request->nombres ?? '', 'UTF-8'),
                    'apellidos' => mb_strtoupper($request->apellidos ?? '', 'UTF-8'),
                    'name' => trim(mb_strtoupper($request->nombres ?? '', 'UTF-8') . ' ' . mb_strtoupper($request->apellidos ?? '', 'UTF-8')),
                    'email' => $request->correo ?: ($request->documento . '@avanzaconoce.com'),
                    'password' => \Illuminate\Support\Facades\Hash::make($request->documento),
                    'sede' => $request->sede ?? 'Principal',
                    'cargo' => mb_strtoupper($request->cargo ?? '', 'UTF-8') ?: 'SIN ASIGNAR',
                    'estado_empleado' => 'Activo',
                    'tipo_funcionario' => 'Consultor',
                    'tipo_vinculacion' => $request->tipo_vinculacion ?? 'Indefinido',
                    'eps' => $request->lps_afiliado ?? 'Sin asignar',
                    'arl' => $request->arl ?? 'Sin asignar',
                    'genero' => 'No especificado',
                    'movil' => '0000000000',
                ]
            );
            $request->merge(['empleado_id' => $user->id]);
        }

        $data = $request->validate([
            'empleado_id'              => 'required|exists:users,id',
            'tipo_contrato'           => 'nullable|string',
            'tipo_vinculacion'        => 'nullable|string',
            'cargo'                   => 'nullable|string',
            'sede'                    => 'nullable|string',
            'area_empresa'            => 'nullable|string',
            'jefe_inmediato'          => 'nullable|string',
            'fecha_ingreso'           => 'nullable|date',
            'fecha_retiro'            => 'nullable|date',
            'salario'                 => 'nullable|numeric',
            'auxilio_transporte_legal' => 'nullable|numeric',
            'arl'                     => 'nullable|string',
            'fecha_vinculacion_arl'    => 'nullable|date',
            'lps_afiliado'            => 'nullable|string',
            'fecha_vinculacion_lps'    => 'nullable|date',
            'caja_compensacion'       => 'nullable|string',
            'fecha_vinculacion_caja'   => 'nullable|date',
            'fondo_pensiones'         => 'nullable|string',
            'fondo_cesantias'         => 'nullable|string',
            'estado_contrato'         => 'nullable|string',
            'empleador'               => 'nullable|string',
            'empresa'                 => 'nullable|string',
            'cliente_proyecto'        => 'nullable|string',
            'origen_seguimiento'      => 'nullable|string',
            'centros_costos'          => 'nullable|array',
            'anexos'                  => 'nullable|array',
        ]);

        $contrato = DB::transaction(function() use ($data) {
            $data['completado'] = ($data['estado_contrato'] ?? 'Activo') !== 'Cancelado';

            $contrato = Contrato::create($data);

            if (!empty($data['centros_costos'])) {
                foreach ($data['centros_costos'] as $cc) {
                    $contrato->centrosCostos()->create($cc);
                }
            }

            if (!empty($data['anexos'])) {
                foreach ($data['anexos'] as $anexo) {
                    $contrato->anexos()->create($anexo);
                }
            }

            return $contrato;
        });

        $this->enviarContratoASharepoint($contrato);

        $pedidoInfo = $this->crearPedidoAutomaticoDesdeContrato($contrato);

        $respuesta = $contrato->load(['empleado', 'centrosCostos', 'anexos']);
        $respuesta->pedido_automatico = $pedidoInfo;

        return response()->json($respuesta, 201);
    }

    public function show(Contrato $contrato)
    {
        return response()->json($contrato->load(['empleado', 'centrosCostos', 'anexos']));
    }

    public function update(Request $request, Contrato $contrato)
    {
        $data = $request->validate([
            'empleado_id'              => 'required|exists:users,id',
            'tipo_contrato'           => 'nullable|string',
            'tipo_vinculacion'        => 'nullable|string',
            'cargo'                   => 'nullable|string',
            'sede'                    => 'nullable|string',
            'area_empresa'            => 'nullable|string',
            'jefe_inmediato'          => 'nullable|string',
            'fecha_ingreso'           => 'nullable|date',
            'fecha_retiro'            => 'nullable|date',
            'salario'                 => 'nullable|numeric',
            'auxilio_transporte_legal' => 'nullable|numeric',
            'arl'                     => 'nullable|string',
            'fecha_vinculacion_arl'    => 'nullable|date',
            'lps_afiliado'            => 'nullable|string',
            'fecha_vinculacion_lps'    => 'nullable|date',
            'caja_compensacion'       => 'nullable|string',
            'fecha_vinculacion_caja'   => 'nullable|date',
            'fondo_pensiones'         => 'nullable|string',
            'fondo_cesantias'         => 'nullable|string',
            'estado_contrato'         => 'nullable|string',
            'empleador'               => 'nullable|string',
            'empresa'                 => 'nullable|string',
            'cliente_proyecto'        => 'nullable|string',
            'origen_seguimiento'      => 'nullable|string',
            'centros_costos'          => 'nullable|array',
            'anexos'                  => 'nullable|array',
        ]);

        return DB::transaction(function() use ($contrato, $data) {
            $data['completado'] = ($data['estado_contrato'] ?? $contrato->estado_contrato) !== 'Cancelado';

            $contrato->update($data);

            // Sincronizar centros de costos
            $contrato->centrosCostos()->delete();
            if (!empty($data['centros_costos'])) {
                foreach ($data['centros_costos'] as $cc) {
                    $contrato->centrosCostos()->create($cc);
                }
            }

            // Sincronizar anexos
            $contrato->anexos()->delete();
            if (!empty($data['anexos'])) {
                foreach ($data['anexos'] as $anexo) {
                    $contrato->anexos()->create($anexo);
                }
            }

            return response()->json($contrato->load(['empleado', 'centrosCostos', 'anexos']));
        });
    }

    public function destroy(Contrato $contrato)
    {
        $contrato->delete();
        return response()->json(null, 204);
    }

    private function descontarInventarioPedido(?string $tallaPolo, ?string $tallaJean, string $generoInv, array &$advertencias): void
    {
        if ($tallaPolo) {
            $inv = InventarioDotacion::where('categoria', 'Polo')
                ->where('genero', $generoInv)
                ->where('talla', $tallaPolo)
                ->first();
            if ($inv && $inv->cantidad >= 2) {
                $inv->decrement('cantidad', 2);
            } else {
                $disponible = $inv?->cantidad ?? 0;
                $advertencias[] = "No se pudo descontar polo {$generoInv} talla {$tallaPolo} (disponible: {$disponible})";
            }
        }

        if ($tallaJean) {
            $inv = InventarioDotacion::where('categoria', 'Jean')
                ->where('genero', $generoInv)
                ->where('talla', $tallaJean)
                ->first();
            if ($inv && $inv->cantidad >= 2) {
                $inv->decrement('cantidad', 2);
            } else {
                $disponible = $inv?->cantidad ?? 0;
                $advertencias[] = "No se pudo descontar jean {$generoInv} talla {$tallaJean} (disponible: {$disponible})";
            }
        }
    }

    private function crearPedidoAutomaticoDesdeContrato(Contrato $contrato): array
    {
        $empleado = $contrato->empleado;
        if (!$empleado || !$empleado->cedula) {
            return ['creado' => false, 'motivo' => 'empleado sin cédula'];
        }

        $cedula = $empleado->cedula;

        // Si ya existe con código consecutivo, no duplicar
        $existente = PedidoAutomatico::where('cedula', $cedula)->first();
        if ($existente && !empty($existente->pedido_inicial)) {
            return ['creado' => false, 'motivo' => 'ya existe un pedido automático para esta cédula'];
        }

        $respuesta     = RespuestaIngreso::where('documento', $cedula)->first();
        $tallaCamisa   = $respuesta?->talla_camisa;
        $tallaPantalon = $respuesta?->talla_pantalon;

        $generoTexto    = strtolower($empleado->genero ?? '');
        $esFemenino     = str_starts_with($generoTexto, 'f') || str_contains($generoTexto, 'femen');
        $generoInv      = $esFemenino ? 'Femenino' : 'Masculino';
        $generoPedido   = $generoInv;

        $advertencias = [];

        if ($tallaCamisa) {
            $stockPolo = InventarioDotacion::where('categoria', 'Polo')
                ->where('genero', $generoInv)
                ->where('talla', $tallaCamisa)
                ->sum('cantidad');
            if ($stockPolo < 2) {
                $advertencias[] = "Stock insuficiente: polo {$generoInv} talla {$tallaCamisa} (disponible: {$stockPolo})";
            }
        } else {
            $advertencias[] = 'Talla de camisa no registrada; valida el polo manualmente.';
        }

        if ($tallaPantalon) {
            $stockJean = InventarioDotacion::where('categoria', 'Jean')
                ->where('genero', $generoInv)
                ->where('talla', $tallaPantalon)
                ->sum('cantidad');
            if ($stockJean < 2) {
                $advertencias[] = "Stock insuficiente: jean {$generoInv} talla {$tallaPantalon} (disponible: {$stockJean})";
            }
        } else {
            $advertencias[] = 'Talla de pantalón no registrada; valida el jean manualmente.';
        }

        // Generar código consecutivo (solo considera pedido_inicial con formato numérico puro)
        $maxNumerico = PedidoAutomatico::whereNotNull('pedido_inicial')
            ->pluck('pedido_inicial')
            ->filter(fn($v) => ctype_digit((string) $v))
            ->map(fn($v) => (int) $v)
            ->max() ?? 0;
        $pedidoInicial = str_pad($maxNumerico + 1, 5, '0', STR_PAD_LEFT);

        if ($existente) {
            // Pedido incompleto sin código — completarlo sin crear duplicado
            $updateData = ['pedido_inicial' => $pedidoInicial];
            if (empty($existente->fecha_inicial)) {
                $updateData['fecha_inicial'] = now()->format('Y-m-d');
            }
            if ($esFemenino) {
                if (empty($existente->polo_femenino_talla))    $updateData['polo_femenino_talla']    = $tallaCamisa;
                if (empty($existente->polo_femenino_cantidad)) $updateData['polo_femenino_cantidad'] = 2;
                if (empty($existente->jean_femenino_talla))    $updateData['jean_femenino_talla']    = $tallaPantalon;
                if (empty($existente->jean_femenino_cantidad)) $updateData['jean_femenino_cantidad'] = 2;
            } else {
                if (empty($existente->polo_masculino_talla))    $updateData['polo_masculino_talla']    = $tallaCamisa;
                if (empty($existente->polo_masculino_cantidad)) $updateData['polo_masculino_cantidad'] = 2;
                if (empty($existente->jean_masculino_talla))    $updateData['jean_masculino_talla']    = $tallaPantalon;
                if (empty($existente->jean_masculino_cantidad)) $updateData['jean_masculino_cantidad'] = 2;
            }
            $existente->update($updateData);
            $pedido = $existente;
        } else {
            $pedidoData = [
                'sede'            => $contrato->sede,
                'cedula'          => $cedula,
                'nombres'         => $empleado->nombres ?? '',
                'apellidos'       => $empleado->apellidos ?? '',
                'cargo'           => $contrato->cargo,
                'tipo_contrato'   => $contrato->tipo_contrato,
                'fecha_ingreso'   => $contrato->fecha_ingreso?->format('Y-m-d'),
                'estado_contrato' => $contrato->estado_contrato,
                'empleador'       => $contrato->empleador,
                'proyecto'        => $contrato->cliente_proyecto,
                'ciudad'          => $respuesta?->ciudad ?? '',
                'genero'          => $generoPedido,
                'estado_acta'     => 'Pendiente',
                'pedido_inicial'  => $pedidoInicial,
                'fecha_inicial'   => now()->format('Y-m-d'),
            ];

            if ($esFemenino) {
                $pedidoData['polo_femenino_talla']    = $tallaCamisa;
                $pedidoData['polo_femenino_cantidad']  = 2;
                $pedidoData['jean_femenino_talla']     = $tallaPantalon;
                $pedidoData['jean_femenino_cantidad']  = 2;
            } else {
                $pedidoData['polo_masculino_talla']    = $tallaCamisa;
                $pedidoData['polo_masculino_cantidad'] = 2;
                $pedidoData['jean_masculino_talla']    = $tallaPantalon;
                $pedidoData['jean_masculino_cantidad'] = 2;
            }

            try {
                $pedido = PedidoAutomatico::create($pedidoData);
            } catch (\Exception $e) {
                Log::warning("No se pudo crear pedido automático para contrato {$contrato->id}: " . $e->getMessage());
                return ['creado' => false, 'motivo' => 'error al crear el pedido: ' . $e->getMessage()];
            }
        }

        // Descontar inventario solo si aún no se ha descontado
        if (!($existente?->inventario_descontado ?? false)) {
            $this->descontarInventarioPedido($tallaCamisa, $tallaPantalon, $generoInv, $advertencias);
        }

        // Marcar inventario descontado
        try {
            $pedido->update(['inventario_descontado' => true]);
        } catch (\Throwable) {
            // Columna aún no migrada — no es crítico
        }

        return ['creado' => true, 'pedido_id' => $pedido->id, 'advertencias' => $advertencias];
    }
}
