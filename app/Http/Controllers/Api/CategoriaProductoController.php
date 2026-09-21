<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CategoriaProducto;
use App\Models\TipoProducto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CategoriaProductoController extends Controller
{
    public function index(Request $request)
    {
        $query = CategoriaProducto::query();

        if ($request->search) {
            $query->where('nombre', 'like', "%{$request->search}%");
        }

        return response()->json($query->orderBy('nombre')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:100|unique:categorias_producto,nombre',
        ]);

        $categoria = CategoriaProducto::create($data);

        return response()->json($categoria, 201);
    }

    public function show(CategoriaProducto $categoriaProducto)
    {
        return response()->json($categoriaProducto);
    }

    /**
     * Si se renombra, los tipos de producto que ya usaban el nombre viejo se actualizan
     * al nuevo (categoria en tipos_producto es texto libre, no una FK), para que no
     * queden huérfanos del catálogo ni de su submódulo de inventario.
     */
    public function update(Request $request, CategoriaProducto $categoriaProducto)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:100|unique:categorias_producto,nombre,' . $categoriaProducto->id,
        ]);

        DB::transaction(function () use ($categoriaProducto, $data) {
            $nombreAnterior = $categoriaProducto->nombre;
            $categoriaProducto->update($data);

            if ($nombreAnterior !== $data['nombre']) {
                TipoProducto::where('categoria', $nombreAnterior)->update(['categoria' => $data['nombre']]);
            }
        });

        return response()->json($categoriaProducto->fresh());
    }

    public function destroy(CategoriaProducto $categoriaProducto)
    {
        $enUso = TipoProducto::where('categoria', $categoriaProducto->nombre)->exists();
        if ($enUso) {
            return response()->json([
                'message' => 'No se puede eliminar: hay tipos de producto usando esta categoría.',
            ], 422);
        }

        $categoriaProducto->delete();
        return response()->json(null, 204);
    }
}
