<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TipoParametro;
use Illuminate\Http\Request;

class TipoParametroController extends Controller
{
    public function index()
    {
        return response()->json(
            TipoParametro::withCount('valores')->orderBy('nombre')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:100|unique:tipos_parametro,nombre',
        ]);

        $tipo = TipoParametro::create($data);

        return response()->json($tipo, 201);
    }

    public function update(Request $request, TipoParametro $tipoParametro)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:100|unique:tipos_parametro,nombre,' . $tipoParametro->id,
        ]);

        $tipoParametro->update($data);

        return response()->json($tipoParametro->fresh());
    }

    public function destroy(TipoParametro $tipoParametro)
    {
        if ($tipoParametro->valores()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar: este tipo de parámetro todavía tiene valores.',
            ], 422);
        }

        $tipoParametro->delete();

        return response()->json(null, 204);
    }
}
