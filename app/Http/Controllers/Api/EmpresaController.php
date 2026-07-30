<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use Illuminate\Http\Request;

class EmpresaController extends Controller
{
    public function index(Request $request)
    {
        // Uso público (dropdowns de Contratos/Empleados/Selección): solo activas, campos mínimos.
        // Parametros > Empresas pide el listado completo vía ?all=1.
        if (!$request->boolean('all')) {
            return response()->json(
                Empresa::where('activo', true)->orderBy('nombre')->get(['id', 'nombre', 'pais'])
            );
        }

        $query = Empresa::query();
        if ($request->search) {
            $query->where('nombre', 'like', "%{$request->search}%");
        }

        return response()->json($query->orderBy('nombre')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:150|unique:empresas,nombre',
            'nit'    => 'nullable|string|max:30',
            'pais'   => 'nullable|string|max:80',
            'activo' => 'boolean',
        ]);
        $data['activo'] = $data['activo'] ?? true;
        $data['pais'] = $data['pais'] ?: 'Colombia';

        $empresa = Empresa::create($data);

        return response()->json($empresa, 201);
    }

    public function show(Empresa $empresa)
    {
        return response()->json($empresa);
    }

    public function update(Request $request, Empresa $empresa)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:150|unique:empresas,nombre,' . $empresa->id,
            'nit'    => 'nullable|string|max:30',
            'pais'   => 'nullable|string|max:80',
            'activo' => 'boolean',
        ]);

        $empresa->update($data);

        return response()->json($empresa->fresh());
    }

    public function destroy(Empresa $empresa)
    {
        $empresa->delete();
        return response()->json(null, 204);
    }
}
