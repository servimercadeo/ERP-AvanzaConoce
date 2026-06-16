<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BaseIngreso;
use App\Models\Candidato;
use App\Models\Contrato;
use App\Models\RespuestaIngreso;
use App\Models\Sede;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ContratoController extends Controller
{
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

        // Fuera de la transacción: si el flujo de SharePoint falla, el contrato ya quedó creado.
        $this->notificarSharepoint($contrato);

        return response()->json($contrato->load(['empleado', 'centrosCostos', 'anexos']), 201);
    }

    /**
     * Envía los datos del contrato recién creado al flujo de Power Automate
     * que genera el documento de la hoja de vida en SharePoint.
     */
    private function notificarSharepoint(Contrato $contrato): void
    {
        $flowUrl = config('services.sharepoint.contrato_flow_url');
        if (!$flowUrl) {
            return;
        }

        $contrato->loadMissing('empleado');
        $user = $contrato->empleado;
        if (!$user || !$user->cedula) {
            return;
        }

        $respuesta = RespuestaIngreso::where('documento', $user->cedula)->first();
        $candidato = Candidato::with('ciudad')->where('identificacion', $user->cedula)->first();
        $ingreso = BaseIngreso::where('documento_identificacion', $user->cedula)->first();

        $jefeEmail = null;
        if ($contrato->sede) {
            $jefeEmail = Sede::where('nombre', $contrato->sede)->first()?->jefe?->email;
        }

        $fecIniContrato = $contrato->fecha_ingreso
            ? mb_strtoupper(Carbon::parse($contrato->fecha_ingreso)->locale('es')->translatedFormat('d \d\e F \d\e Y'), 'UTF-8')
            : '';

        $payload = [
            'nombres'             => $user->nombres ?? $respuesta?->nombres ?? '',
            'apellidos'           => $user->apellidos ?? $respuesta?->apellidos ?? '',
            'documento'           => $user->cedula,
            'celular'             => $user->movil ?? $respuesta?->celular ?? $candidato?->celular ?? $ingreso?->telefono ?? '',
            'correo'              => $user->email ?? $respuesta?->correo ?? $candidato?->correo ?? $ingreso?->correo ?? '',
            'ciudad'              => $respuesta?->ciudad ?? $ingreso?->ciudad ?? $candidato?->ciudad?->nombre ?? '',
            'direccion'           => $respuesta?->direccion ?? $user->direccion_residencia ?? '',
            'fecha_nacimiento'    => $this->formatFecha($user->fecha_nacimiento ?? $respuesta?->fecha_nacimiento),
            'fecha_expedicion'    => $this->formatFecha($candidato?->fecha_expedicion),
            'lugar_expedicion'    => '', // No existe en ninguna tabla del sistema actualmente.
            'grupo_rh'            => $user->rh ?? $respuesta?->rh ?? '',
            'contacto_emergencia' => $user->contacto_emergencia_nombre ?? $respuesta?->emergencia_nombre ?? '',
            'parentesco'          => $user->contacto_emergencia_parentesco ?? $respuesta?->emergencia_parentesco ?? '',
            'nro_contacto'        => $user->contacto_emergencia_telefono ?? $respuesta?->emergencia_telefono ?? '',
            'fec_ini_contrato'    => $fecIniContrato,
            't_camisa'            => $respuesta?->talla_camisa ?? '',
            't_pantalon'          => $respuesta?->talla_pantalon ?? '',
            't_zapatos'           => $respuesta?->talla_zapatos ?? '',
            'CorreoSuper'         => $jefeEmail ?? '',
            'Departamento'        => $contrato->area_empresa ?? '',
        ];

        try {
            Http::timeout(15)->post($flowUrl, $payload);
        } catch (\Exception $e) {
            Log::warning('No se pudo notificar a SharePoint la creación del contrato ' . $contrato->id . ': ' . $e->getMessage());
        }
    }

    /**
     * Normaliza a 'Y-m-d' un valor de fecha que puede venir como string plano
     * (columnas sin cast, ej. RespuestaIngreso) o como instancia Carbon (columnas con cast).
     */
    private function formatFecha(mixed $value): string
    {
        return $value ? Carbon::parse($value)->format('Y-m-d') : '';
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
}
