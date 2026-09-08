<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TipoProducto;
use Illuminate\Http\Request;

class TipoProductoController extends Controller
{
    public function index(Request $request)
    {
        $query = TipoProducto::query();

        if ($request->search) {
            $query->where('nombre', 'like', "%{$request->search}%");
        }
        if ($request->categoria) {
            $query->where('categoria', $request->categoria);
        }

        return response()->json($query->orderBy('categoria')->orderBy('nombre')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre'      => 'required|string|max:150|unique:tipos_producto,nombre',
            'categoria'   => 'required|string|in:' . implode(',', TipoProducto::CATEGORIAS),
            'descripcion' => 'nullable|string|max:255',
        ]);

        $tipo = TipoProducto::create($data);

        return response()->json($tipo, 201);
    }

    public function show(TipoProducto $tipoProducto)
    {
        return response()->json($tipoProducto);
    }

    public function update(Request $request, TipoProducto $tipoProducto)
    {
        $data = $request->validate([
            'nombre'      => 'required|string|max:150|unique:tipos_producto,nombre,' . $tipoProducto->id,
            'categoria'   => 'required|string|in:' . implode(',', TipoProducto::CATEGORIAS),
            'descripcion' => 'nullable|string|max:255',
        ]);

        $tipoProducto->update($data);

        return response()->json($tipoProducto->fresh());
    }

    public function destroy(TipoProducto $tipoProducto)
    {
        $tipoProducto->delete();
        return response()->json(null, 204);
    }
}
