<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\AvalContratacionMail;
use App\Models\BaseIngreso;
use App\Models\Candidato;
use App\Models\Empleador;
use App\Models\Requisicion;
use App\Services\EmpresaProyectoRules;
use App\Services\IdentidadUnica;
use Illuminate\Validation\ValidationException;
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
            'empleador',
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
            'lugar_expedicion'  => 'nullable|string|max:150',
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
            'genero'            => 'nullable|string|max:30',
            'fotografia'        => 'nullable|max:5120',
        ]);

        // Cada persona se registra una sola vez, con su propio correo y celular, y sin ser
        // ya un empleado activo.
        if ($msg = IdentidadUnica::cedulaDeOtroCandidato($data['identificacion'])
            ?? IdentidadUnica::cedulaDeEmpleadoActivo($data['identificacion'])) {
            throw ValidationException::withMessages(['identificacion' => $msg]);
        }
        if ($msg = IdentidadUnica::correoDeOtraPersona($data['correo'], $data['identificacion'])) {
            throw ValidationException::withMessages(['correo' => $msg]);
        }
        if ($msg = IdentidadUnica::telefonoDeOtraPersona($data['celular'] ?? null, $data['identificacion'])) {
            throw ValidationException::withMessages(['celular' => $msg]);
        }

        if ($request->hasFile('fotografia')) {
            $data['fotografia'] = $request->file('fotografia')->store('candidatos/fotos', 'public');
        } elseif (!array_key_exists('fotografia', $data) || $data['fotografia'] === null) {
            unset($data['fotografia']);
        }

        if (empty($data['fecha_postulacion'])) {
            $data['fecha_postulacion'] = now()->toDateString();
        }

        if (isset($data['nombres'])) {
            $data['nombres'] = strtoupper($data['nombres']);
        }

        $candidato = Candidato::create($data);

        if ($candidato->identificacion) {
            app(\App\Services\EmpleadoSyncService::class)->syncToUser($candidato->identificacion, [
                'email'             => $candidato->correo,
                'movil'             => $candidato->celular,
                'fecha_expedicion'  => $candidato->fecha_expedicion,
                'genero'            => $candidato->genero,
            ]);
        }

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
            'lugar_expedicion'         => 'nullable|string|max:150',
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
            'empleador_id'             => 'nullable|exists:empleadores,id',
            'correos_aval'             => 'nullable|array',
            'correos_aval.*'           => 'email',
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
            'genero'                       => 'nullable|string|max:30',
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
            'fotografia'               => 'nullable|max:5120',
        ]);

        // Al editar: la cédula y el correo siguen sin poder ser de otra persona.
        $cedulaFinal = $data['identificacion'] ?? $candidato->identificacion;
        if (array_key_exists('identificacion', $data)
            && ($msg = IdentidadUnica::cedulaDeOtroCandidato($cedulaFinal, $candidato->id))) {
            throw ValidationException::withMessages(['identificacion' => $msg]);
        }
        if (array_key_exists('correo', $data)
            && ($msg = IdentidadUnica::correoDeOtraPersona($data['correo'], $cedulaFinal))) {
            throw ValidationException::withMessages(['correo' => $msg]);
        }
        if (array_key_exists('celular', $data)
            && ($msg = IdentidadUnica::telefonoDeOtraPersona($data['celular'], $cedulaFinal))) {
            throw ValidationException::withMessages(['celular' => $msg]);
        }

        if ($request->hasFile('fotografia')) {
            $data['fotografia'] = $request->file('fotografia')->store('candidatos/fotos', 'public');
        } elseif (!array_key_exists('fotografia', $data) || $data['fotografia'] === null) {
            unset($data['fotografia']);
        }

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
                $requisicionAval = Requisicion::find($data['requisicion_id'] ?? $candidato->requisicion_id);
                if ($requisicionAval && !$requisicionAval->tieneVacantesLibres()) {
                    return response()->json(
                        ['message' => "La requisición {$requisicionAval->nro_identificacion_proceso} ya tiene {$requisicionAval->vacantesCubiertas()} de {$requisicionAval->vacantesRequeridas()} vacantes cubiertas. Aumenta el número de vacantes para dar otro aval."],
                        422
                    );
                }
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

                $tipoVinculacion = $data['tipo_vinculacion'] ?? $candidato->tipo_vinculacion;
                $correosAval     = $data['correos_aval'] ?? [];

                // El empleador del candidato se elige al dar el aval (ya no en la requisición):
                // directo para la vinculación Directa, indirecto para la Indirecta.
                $tipoEmpleador = ['Directa' => 'Directo', 'Indirecta' => 'Indirecto'][$tipoVinculacion] ?? null;
                $empleador = Empleador::find($data['empleador_id'] ?? null);
                if (!$empleador) {
                    return response()->json(
                        ['message' => 'Selecciona el empleador del candidato para dar el aval.'],
                        422
                    );
                }
                if ($empleador->tipo !== $tipoEmpleador) {
                    return response()->json(
                        ['message' => "El empleador {$empleador->nombre} no es " . mb_strtolower((string) $tipoEmpleador) . ': no corresponde a la vinculación ' . $tipoVinculacion . '.'],
                        422
                    );
                }
                // Empleador directo => la empresa de la requisición debe ser la suya.
                $empresaAval = $requisicionAval?->empresa?->nombre;
                if ($msg = EmpresaProyectoRules::validarEmpleador($empleador->nombre, $empresaAval)) {
                    return response()->json(['message' => $msg], 422);
                }

                // Los destinatarios salen de los contactos registrados en Parámetros > Empleadores
                // (tabla `empleador_contactos`) del empleador elegido. El frontend ya los filtra;
                // esto solo evita que llegue un correo que no está en el catálogo.
                $correosPermitidos = $empleador->contactos()->pluck('correo')->all();

                if (array_diff($correosAval, $correosPermitidos)) {
                    return response()->json(
                        ['message' => 'Los correos seleccionados no corresponden a los contactos del empleador ' . $empleador->nombre . '.'],
                        422
                    );
                }
            }
        }

        $avalAntes        = $candidato->aval;
        $requisicionAntes = $candidato->requisicion_id;

        // Si se está desactivando el aval, forzar estado = Entrevista sin importar lo que venga del frontend
        if ($avalAntes && array_key_exists('aval', $data) && !$data['aval']) {
            $data['estado'] = 'Entrevista';
            $data['empleador_id'] = null;
        }

        $candidato->update($data);

        if ($candidato->identificacion) {
            app(\App\Services\EmpleadoSyncService::class)->syncToUser($candidato->identificacion, [
                'email'             => $candidato->correo,
                'movil'             => $candidato->celular,
                'fecha_expedicion'  => $candidato->fecha_expedicion,
                'arl'               => $candidato->arl,
                'caja_compensacion' => $candidato->caja_compensacion,
                'ingresos'          => $candidato->salario_basico,
                'genero'            => $candidato->genero,
            ]);
        }

        if (!$avalAntes && !empty($data['aval']) && $data['aval']) {
            $candidato->refresh()->load(['requisicion.proyecto', 'requisicion.empresa', 'requisicion.cargo', 'requisicion.empleador', 'ciudad']);
            $baseIngreso = BaseIngreso::where('candidato_id', $candidato->id)->latest()->first();
            $recipients  = $candidato->correos_aval ?: [];
            if ($recipients) {
                try {
                    Mail::to($recipients)->send(new AvalContratacionMail($candidato, $baseIngreso));
                } catch (\Exception $e) {
                    Log::error('Correo de aval no enviado: ' . $e->getMessage());
                }
            }
        } elseif ($avalAntes && array_key_exists('aval', $data) && !$data['aval']) {
            BaseIngreso::where('candidato_id', $candidato->id)->delete();
        }

        // Cambiar el aval o mover el candidato de requisición cambia las vacantes cubiertas:
        // cerrar/reabrir automáticamente la(s) requisición(es) afectada(s).
        if ((bool) $avalAntes !== (bool) $candidato->aval || $requisicionAntes != $candidato->requisicion_id) {
            Requisicion::actualizarEstadoPorVacantesDe($candidato->requisicion_id);
            if ($requisicionAntes != $candidato->requisicion_id) {
                Requisicion::actualizarEstadoPorVacantesDe($requisicionAntes);
            }
        }

        return response()->json($candidato->load(['requisicion.cargo', 'requisicion.proyecto', 'requisicion.empresa', 'ciudad']));
    }

    public function destroy(Candidato $candidato)
    {
        $candidato->delete();
        if ($candidato->aval) {
            Requisicion::actualizarEstadoPorVacantesDe($candidato->requisicion_id);
        }
        return response()->json(null, 204);
    }
}
