<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\AvalContratacionMail;
use App\Models\BaseIngreso;
use App\Models\Candidato;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class CandidatoController extends Controller
{
    public function index(Request $request)
    {
        $query = Candidato::with([
            'requisicion.proyecto',
            'requisicion.empresa',
            'requisicion.cargo',
            'requisicion.empleador',
            'ciudad',
            'documentos' => fn($q) => $q->whereIn('nombre', ['Hoja de vida', 'Pruebas psicotécnicas'])
                                        ->select(['id', 'candidato_id', 'nombre']),
        ]);

        if ($request->requisicion_id) {
            $query->where('requisicion_id', $request->requisicion_id);
        }

        if ($request->search) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nombres', 'like', "%$s%")
                  ->orWhere('identificacion', 'like', "%$s%")
                  ->orWhere('correo', 'like', "%$s%");
            });
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'requisicion_id'    => 'nullable|exists:requisiciones,id',
            'nombres'           => 'required|string|max:200',
            'tipo_documento'    => 'nullable|string|max:60',
            'identificacion'    => 'required|string|max:30',
            'fecha_expedicion'  => 'nullable|date',
            'edad'              => 'nullable|integer|min:14|max:100',
            'ciudad_id'         => 'nullable|exists:ciudades,id',
            'correo'            => 'required|email|max:180',
            'celular'           => 'nullable|string|max:20',
            'fecha_postulacion' => 'nullable|date',
            'fuente'            => 'nullable|string|max:80',
            'fuente_especifica' => 'nullable|string|max:80',
            'estado'            => 'nullable|string|max:60',
            'pruebas'           => 'nullable|boolean',
            'aval'              => 'nullable|boolean',
            'negocio'           => 'nullable|string|max:150',
            'observaciones'     => 'nullable|string',
        ]);

        if (empty($data['fecha_postulacion'])) {
            $data['fecha_postulacion'] = now()->toDateString();
        }

        if (isset($data['nombres'])) {
            $data['nombres'] = strtoupper($data['nombres']);
        }

        $candidato = Candidato::create($data);
        return response()->json($candidato->load(['requisicion.cargo', 'ciudad']), 201);
    }

    public function show(Candidato $candidato)
    {
        return response()->json($candidato->load(['requisicion.cargo', 'ciudad']));
    }

    public function update(Request $request, Candidato $candidato)
    {
        $data = $request->validate([
            'requisicion_id'           => 'nullable|exists:requisiciones,id',
            'nombres'                  => 'sometimes|required|string|max:200',
            'tipo_documento'           => 'nullable|string|max:60',
            'identificacion'           => 'sometimes|required|string|max:30',
            'fecha_expedicion'         => 'nullable|date',
            'edad'                     => 'nullable|integer|min:14|max:100',
            'ciudad_id'                => 'nullable|exists:ciudades,id',
            'correo'                   => 'sometimes|required|email|max:180',
            'celular'                  => 'nullable|string|max:20',
            'fecha_postulacion'        => 'nullable|date',
            'fuente'                   => 'nullable|string|max:80',
            'fuente_especifica'        => 'nullable|string|max:80',
            'estado'                   => 'nullable|string|max:60',
            'pruebas'                  => 'nullable|boolean',
            'aval'                     => 'nullable|boolean',
            'tipo_vinculacion'         => 'nullable|string|in:Directa,Indirecta',
            'fecha_aval'               => 'nullable|date',
            'negocio'                  => 'nullable|string|max:150',
            'observaciones'            => 'nullable|string',
            // Assessment
            'asmt_ejercicio'           => 'nullable|string|max:120',
            'asmt_nombre_ejercicio'    => 'nullable|string|max:120',
            'asmt_claridad_mensaje'    => 'nullable|integer|min:1|max:5',
            'asmt_conviccion_energia'  => 'nullable|integer|min:1|max:5',
            'asmt_adaptabilidad_escucha' => 'nullable|integer|min:1|max:5',
            'asmt_orientacion_accion'  => 'nullable|integer|min:1|max:5',
            'asmt_manejo_presion'      => 'nullable|integer|min:1|max:5',
            'asmt_prom'                => 'nullable|numeric',
            // Entrevista
            'entv_trayectoria'         => 'nullable|integer|min:1|max:5',
            'entv_conexion_cliente'    => 'nullable|integer|min:1|max:5',
            'entv_aprendizaje_madurez' => 'nullable|integer|min:1|max:5',
            'entv_motivacion'          => 'nullable|integer|min:1|max:5',
            'entv_disposicion_proyecto'=> 'nullable|integer|min:1|max:5',
            'entv_prom'                => 'nullable|numeric',
            // Otras secciones
            'retroalimentacion'        => 'nullable|string',
            'ref_laboral_1'            => 'nullable|string',
            'ref_laboral_2'            => 'nullable|string',
            'fraude_nro_seguimiento'   => 'nullable|string|max:60',
            'fraude_respuesta'         => 'nullable|string|max:120',
            'fraude_ciudad'            => 'nullable|string|max:100',
            'fraude_fecha_consulta'    => 'nullable|date',
            'fraude_fuente'            => 'nullable|string|max:120',
            'seguridad_estudio'        => 'nullable|string',
            // Datos de contratación
            'lugar_trabajo'                => 'nullable|string|max:200',
            'fecha_programacion_ingreso'   => 'nullable|date',
            'fecha_correccion'             => 'nullable|date',
            // Remuneración
            'tasa_riesgo_arl'          => 'nullable|string|max:20',
            'arl'                      => 'nullable|string|max:120',
            'caja_compensacion'        => 'nullable|string|max:120',
            'salario_basico'           => 'nullable|numeric',
            'auxilio_transporte'       => 'nullable|numeric',
            'otrosi_variable'          => 'nullable|numeric',
            'auxilio_rodamiento'       => 'nullable|numeric',
            'auxilio_comunicacion'     => 'nullable|numeric',
            'auxilio_alimentacion'     => 'nullable|numeric',
        ]);

        if (isset($data['nombres'])) {
            $data['nombres'] = strtoupper($data['nombres']);
        }

        // Enforce prerequisites when activating pruebas or aval
        $activandoPruebas = array_key_exists('pruebas', $data) && $data['pruebas'] && !$candidato->pruebas;
        $activandoAval    = array_key_exists('aval', $data)    && $data['aval']    && !$candidato->aval;

        if ($activandoPruebas || $activandoAval) {
            $candidato->loadMissing('requisicion.proyecto');
            $isTigo = str_contains(
                strtolower($candidato->requisicion?->proyecto?->nombre ?? ''),
                'tigo'
            );
            $docCount = $candidato->documentos()
                ->whereIn('nombre', ['Hoja de vida', 'Pruebas psicotécnicas'])
                ->count();

            if ($activandoPruebas) {
                if ($docCount < 2) {
                    return response()->json(
                        ['message' => 'Sube "Hoja de vida" y "Pruebas psicotécnicas" antes de activar este check.'],
                        422
                    );
                }
                if ($isTigo && $candidato->asmt_prom === null && ($data['asmt_prom'] ?? null) === null) {
                    return response()->json(
                        ['message' => 'Completa el Assessment en Procesos antes de activar Pruebas psicotécnicas.'],
                        422
                    );
                }
            }

            if ($activandoAval) {
                $pruebasActivas = $data['pruebas'] ?? $candidato->pruebas;
                if (!$pruebasActivas) {
                    return response()->json(
                        ['message' => 'Activa primero Pruebas psicotécnicas.'],
                        422
                    );
                }
                if ($docCount < 2) {
                    return response()->json(
                        ['message' => 'Sube "Hoja de vida" y "Pruebas psicotécnicas" antes de activar el Aval.'],
                        422
                    );
                }
                if ($isTigo && $candidato->entv_prom === null && ($data['entv_prom'] ?? null) === null) {
                    return response()->json(
                        ['message' => 'Completa la Entrevista en Procesos antes de activar el Aval de contratación.'],
                        422
                    );
                }
                $tasaArl    = $data['tasa_riesgo_arl'] ?? $candidato->tasa_riesgo_arl;
                $salario    = $data['salario_basico']   ?? $candidato->salario_basico;
                if (empty($tasaArl) || is_null($salario) || $salario <= 0) {
                    return response()->json(
                        ['message' => 'Completa los campos de remuneración del candidato (Tasa de riesgo ARL y Salario básico) antes de activar el Aval.'],
                        422
                    );
                }
            }
        }

        $avalAntes = $candidato->aval;
        $candidato->update($data);

        if (!$avalAntes && !empty($data['aval']) && $data['aval']) {
            $candidato->refresh()->load(['requisicion.proyecto', 'requisicion.empresa', 'requisicion.cargo', 'requisicion.empleador', 'ciudad']);
            $baseIngreso = BaseIngreso::where('candidato_id', $candidato->id)->latest()->first();
            $recipient   = config('mail.aval_recipient');
            try {
                Mail::to($recipient)->send(new AvalContratacionMail($candidato, $baseIngreso));
            } catch (\Exception $e) {
                Log::warning('Correo de aval no enviado: ' . $e->getMessage());
            }
        } elseif ($avalAntes && array_key_exists('aval', $data) && !$data['aval']) {
            BaseIngreso::where('candidato_id', $candidato->id)->delete();
        }

        return response()->json($candidato->load(['requisicion.cargo', 'requisicion.proyecto', 'ciudad']));
    }

    public function destroy(Candidato $candidato)
    {
        $candidato->delete();
        return response()->json(null, 204);
    }
}
