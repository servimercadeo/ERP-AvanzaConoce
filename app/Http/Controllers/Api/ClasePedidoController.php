<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClasePedido;
use Illuminate\Http\Request;

class ClasePedidoController extends Controller
{
    public function index(Request $request)
    {
        $query = ClasePedido::query();

        if ($request->search) {
            $query->where('nombre', 'like', "%{$request->search}%");
        }

        return response()->json($query->orderBy('nombre')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre'      => 'required|string|max:150|unique:clases_pedido,nombre',
            'descripcion' => 'nullable|string|max:255',
        ]);

        $clase = ClasePedido::create($data);

        return response()->json($clase, 201);
    }

    public function show(ClasePedido $clasePedido)
    {
        return response()->json($clasePedido);
    }

    public function update(Request $request, ClasePedido $clasePedido)
    {
        $data = $request->validate([
            'nombre'      => 'required|string|max:150|unique:clases_pedido,nombre,' . $clasePedido->id,
            'descripcion' => 'nullable|string|max:255',
        ]);

        $clasePedido->update($data);

        return response()->json($clasePedido->fresh());
    }

    public function destroy(ClasePedido $clasePedido)
    {
        $clasePedido->delete();
        return response()->json(null, 204);
    }
}
