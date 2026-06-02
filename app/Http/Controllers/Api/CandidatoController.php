<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\AvalContratacionMail;
use App\Models\BaseIngreso;
use App\Models\Candidato;
use Illuminate\Http\Request;
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
        ]);

        if (isset($data['nombres'])) {
            $data['nombres'] = strtoupper($data['nombres']);
        }

        $avalAntes = $candidato->aval;
        $candidato->update($data);

        if (!$avalAntes && !empty($data['aval']) && $data['aval']) {
            $candidato->load(['requisicion.proyecto', 'requisicion.empresa', 'requisicion.cargo', 'ciudad']);
            $baseIngreso = BaseIngreso::where('candidato_id', $candidato->id)->latest()->first();
            $recipient   = config('mail.aval_recipient', env('MAIL_AVAL_TO', 'marin.jc2005@gmail.com'));
            Mail::to($recipient)->send(new AvalContratacionMail($candidato, $baseIngreso));
        }

        return response()->json($candidato->load(['requisicion.cargo', 'ciudad']));
    }

    public function destroy(Candidato $candidato)
    {
        $candidato->delete();
        return response()->json(null, 204);
    }
}
