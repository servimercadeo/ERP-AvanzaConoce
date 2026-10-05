<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ValorParametro;
use Illuminate\Http\Request;

class ValorParametroController extends Controller
{
    public function index(Request $request)
    {
        $query = ValorParametro::query();

        if ($request->tipo_parametro_id) {
            $query->where('tipo_parametro_id', $request->tipo_parametro_id);
        }

        return response()->json($query->orderBy('nombre')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'tipo_parametro_id' => 'required|exists:tipos_parametro,id',
            'nombre' => 'required|string|max:150',
            'descripcion' => 'nullable|string|max:255',
        ]);

        $valor = ValorParametro::create($data);

        return response()->json($valor, 201);
    }

    public function update(Request $request, ValorParametro $valorParametro)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:150',
            'descripcion' => 'nullable|string|max:255',
        ]);

        $valorParametro->update($data);

        return response()->json($valorParametro->fresh());
    }

    public function destroy(ValorParametro $valorParametro)
    {
        $valorParametro->delete();

        return response()->json(null, 204);
    }
}
