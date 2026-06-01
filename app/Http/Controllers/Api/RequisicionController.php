<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Requisicion;
use Illuminate\Http\Request;

class RequisicionController extends Controller
{
    public function index(Request $request)
    {
        $query = Requisicion::with(['proyecto', 'empresa', 'cargo', 'ciudad', 'empleador']);

        if ($request->search) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nro_identificacion_proceso', 'like', "%$s%")
                  ->orWhere('responsable', 'like', "%$s%")
                  ->orWhereHas('cargo', fn($c) => $c->where('nombre', 'like', "%$s%"))
                  ->orWhereHas('ciudad', fn($c) => $c->where('nombre', 'like', "%$s%"));
            });
        }

        if ($request->estado && $request->estado !== 'Todas') {
            $query->where('estado', $request->estado);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nro_identificacion'      => 'nullable|string|max:30',
            'estado'                  => 'nullable|string|max:30',
            'cargo_id'                => 'nullable|exists:cargos,id',
            'cargo_solicitante'       => 'nullable|string|max:150',
            'fecha_solicitud'         => 'required|date',
            'fecha_ingreso'           => 'nullable|date',
            'fecha_cierre'            => 'nullable|date',
            'requeridas'              => 'nullable|integer|min:1',
            'proyecto_id'             => 'nullable|exists:proyectos,id',
            'empresa_id'              => 'nullable|exists:empresas,id',
            'empleador_id'            => 'nullable|exists:empleadores,id',
            'tipo_solicitud'          => 'nullable|string|max:60',
            'responsable'             => 'nullable|string|max:200',
            'proceso'                 => 'nullable|string|max:80',
            'ciudad_id'               => 'nullable|exists:ciudades,id',
            'pais'                    => 'nullable|string|max:80',
            'solicitud_confidencial'  => 'nullable|boolean',
            'observaciones'           => 'nullable|string',
        ]);

        $max = Requisicion::pluck('nro_identificacion_proceso')
            ->map(fn($n) => (int) preg_replace('/\D/', '', $n))
            ->filter()
            ->max() ?? 64;
        $data['nro_identificacion_proceso'] = 'REQ' . ($max + 1);

        $req = Requisicion::create($data);
        return response()->json($req->load(['proyecto', 'empresa', 'cargo', 'ciudad', 'empleador']), 201);
    }

    public function show(Requisicion $requisicion)
    {
        return response()->json($requisicion->load(['proyecto', 'cargo', 'ciudad', 'empleador', 'candidatos']));
    }

    public function update(Request $request, Requisicion $requisicion)
    {
        $data = $request->validate([
            'nro_identificacion'      => 'nullable|string|max:30',
            'estado'                  => 'nullable|string|max:30',
            'cargo_id'                => 'nullable|exists:cargos,id',
            'cargo_solicitante'       => 'nullable|string|max:150',
            'fecha_solicitud'         => 'sometimes|date',
            'fecha_ingreso'           => 'nullable|date',
            'fecha_cierre'            => 'nullable|date',
            'requeridas'              => 'nullable|integer|min:1',
            'contratadas'             => 'nullable|integer|min:0',
            'proyecto_id'             => 'nullable|exists:proyectos,id',
            'empresa_id'              => 'nullable|exists:empresas,id',
            'empleador_id'            => 'nullable|exists:empleadores,id',
            'tipo_solicitud'          => 'nullable|string|max:60',
            'responsable'             => 'nullable|string|max:200',
            'proceso'                 => 'nullable|string|max:80',
            'ciudad_id'               => 'nullable|exists:ciudades,id',
            'pais'                    => 'nullable|string|max:80',
            'solicitud_confidencial'  => 'nullable|boolean',
            'observaciones'           => 'nullable|string',
        ]);

        $requisicion->update($data);
        return response()->json($requisicion->load(['proyecto', 'empresa', 'cargo', 'ciudad', 'empleador']));
    }

    public function destroy(Requisicion $requisicion)
    {
        $requisicion->delete();
        return response()->json(null, 204);
    }
}
