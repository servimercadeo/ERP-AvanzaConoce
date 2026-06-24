<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidato;
use App\Models\Contrato;
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
            $query->where(function ($q) use ($s) {
                $q->whereHas('empleado', function ($inner) use ($s) {
                    $inner->where('name', 'like', "%$s%")
                          ->orWhere('nombres', 'like', "%$s%")
                          ->orWhere('apellidos', 'like', "%$s%")
                          ->orWhere('cedula', 'like', "%$s%");
                })->orWhere('cargo', 'like', "%$s%");
            });
        }

        // El filtro de estado ya fue manejado arriba via completado
        if ($request->estado && $request->estado !== 'Todos' && $request->estado !== 'Contrato anulado') {
            $query->where('estado_contrato', $request->estado);
        }

        if ($request->sede && $request->sede !== 'Todas') {
            $query->where('sede', $request->sede);
        }

        $contratos = $query->orderBy('created_at', 'desc')->get()->map(function ($contrato) {
            if ($contrato->empleado && !$contrato->empleado->fotografia) {
                $foto = \Illuminate\Support\Facades\DB::table('candidatos')
                    ->where('identificacion', $contrato->empleado->cedula)
                    ->value('fotografia');
                if ($foto) {
                    $contrato->empleado->fotografia = $foto;
                }
            }
            return $contrato;
        });

        return response()->json($contratos);
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
            // Copiar fotografia del candidato si el usuario fue creado nuevo
            if ($user->wasRecentlyCreated) {
                $fotoCandidato = \Illuminate\Support\Facades\DB::table('candidatos')
                    ->where('identificacion', $request->documento)
                    ->value('fotografia');
                if ($fotoCandidato) {
                    $user->fotografia = $fotoCandidato;
                    $user->save();
                }
            }

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
            $data['completado'] = true;

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

        // Sync campos del contrato al empleado
        $contratoUser = \App\Models\User::find($contrato->empleado_id);
        if ($contratoUser?->cedula) {
            app(\App\Services\EmpleadoSyncService::class)->syncToUser($contratoUser->cedula, [
                'ingresos'          => $contrato->salario,
                'caja_compensacion' => $contrato->caja_compensacion,
                'arl'               => $contrato->arl,
                'fondo_pensiones'   => $contrato->fondo_pensiones,
                'eps'               => $contrato->lps_afiliado,
                'cargo'             => $contrato->cargo,
                'sede'              => $contrato->sede,
                'tipo_vinculacion'  => $contrato->tipo_vinculacion,
                'empleador'         => $contrato->empleador,
                'jefe_inmediato'    => $contrato->jefe_inmediato,
            ]);
        }

        return response()->json($contrato->load(['empleado', 'centrosCostos', 'anexos']), 201);
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

        $result = DB::transaction(function() use ($contrato, $data) {
            $data['completado'] = true;

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

            return $contrato->load(['empleado', 'centrosCostos', 'anexos']);
        });

        // Sync campos del contrato al empleado
        $contratoUser = \App\Models\User::find($result->empleado_id);
        if ($contratoUser?->cedula) {
            app(\App\Services\EmpleadoSyncService::class)->syncToUser($contratoUser->cedula, [
                'ingresos'          => $result->salario,
                'caja_compensacion' => $result->caja_compensacion,
                'arl'               => $result->arl,
                'fondo_pensiones'   => $result->fondo_pensiones,
                'eps'               => $result->lps_afiliado,
                'cargo'             => $result->cargo,
                'sede'              => $result->sede,
                'tipo_vinculacion'  => $result->tipo_vinculacion,
                'empleador'         => $result->empleador,
                'jefe_inmediato'    => $result->jefe_inmediato,
            ]);
        }

        return response()->json($result);
    }

    public function destroy(Contrato $contrato)
    {
        $contrato->delete();
        return response()->json(null, 204);
    }

}
