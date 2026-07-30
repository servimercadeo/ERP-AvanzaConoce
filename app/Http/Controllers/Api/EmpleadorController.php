<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empleador;
use Illuminate\Http\Request;

class EmpleadorController extends Controller
{
    public function index(Request $request)
    {
        $query = Empleador::query();

        if ($request->search) {
            $query->where('nombre', 'like', "%{$request->search}%");
        }

        return response()->json($query->orderBy('nombre')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:150',
            'tipo'   => 'nullable|string|in:Directo,Indirecto',
            'correo' => 'nullable|email|max:180',
        ]);
        $data['tipo'] = $data['tipo'] ?? 'Indirecto';

        // empleadores.id no es autoincremental (catálogo importado por CSV con ids fijos),
        // así que hay que asignarlo manualmente para los registros nuevos.
        $data['id'] = (int) (Empleador::max('id') ?? 0) + 1;

        $empleador = Empleador::create($data);

        return response()->json($empleador, 201);
    }

    public function show(Empleador $empleador)
    {
        return response()->json($empleador);
    }

    public function update(Request $request, Empleador $empleador)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:150',
            'tipo'   => 'required|string|in:Directo,Indirecto',
            'correo' => 'nullable|email|max:180',
        ]);

        $empleador->update($data);

        return response()->json($empleador->fresh());
    }

    public function destroy(Empleador $empleador)
    {
        $empleador->delete();
        return response()->json(null, 204);
    }
}
