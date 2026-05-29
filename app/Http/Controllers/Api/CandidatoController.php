<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidato;
use Illuminate\Http\Request;

class CandidatoController extends Controller
{
    public function index(Request $request)
    {
        $query = Candidato::with('requisicion');

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
            'ciudad'            => 'nullable|string|max:120',
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
            'procesos'          => 'nullable|array',
        ]);

        if (empty($data['fecha_postulacion'])) {
            $data['fecha_postulacion'] = now()->toDateString();
        }

        if (isset($data['nombres'])) {
            $data['nombres'] = strtoupper($data['nombres']);
        }

        $candidato = Candidato::create($data);
        return response()->json($candidato->load('requisicion'), 201);
    }

    public function show(Candidato $candidato)
    {
        return response()->json($candidato->load('requisicion'));
    }

    public function update(Request $request, Candidato $candidato)
    {
        $data = $request->validate([
            'requisicion_id'    => 'nullable|exists:requisiciones,id',
            'nombres'           => 'sometimes|required|string|max:200',
            'tipo_documento'    => 'nullable|string|max:60',
            'identificacion'    => 'sometimes|required|string|max:30',
            'fecha_expedicion'  => 'nullable|date',
            'edad'              => 'nullable|integer|min:14|max:100',
            'ciudad'            => 'nullable|string|max:120',
            'correo'            => 'sometimes|required|email|max:180',
            'celular'           => 'nullable|string|max:20',
            'fecha_postulacion' => 'nullable|date',
            'fuente'            => 'nullable|string|max:80',
            'fuente_especifica' => 'nullable|string|max:80',
            'estado'            => 'nullable|string|max:60',
            'pruebas'           => 'nullable|boolean',
            'aval'              => 'nullable|boolean',
            'negocio'           => 'nullable|string|max:150',
            'observaciones'     => 'nullable|string',
            'procesos'          => 'nullable|array',
        ]);

        if (isset($data['nombres'])) {
            $data['nombres'] = strtoupper($data['nombres']);
        }

        $candidato->update($data);
        return response()->json($candidato->load('requisicion'));
    }

    public function destroy(Candidato $candidato)
    {
        $candidato->delete();
        return response()->json(null, 204);
    }
}
