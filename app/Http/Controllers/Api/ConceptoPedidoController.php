<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConceptoPedido;
use Illuminate\Http\Request;

class ConceptoPedidoController extends Controller
{
    public function index(Request $request)
    {
        $query = ConceptoPedido::query();

        if ($request->search) {
            $query->where('nombre', 'like', "%{$request->search}%");
        }

        return response()->json($query->orderBy('nombre')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre'      => 'required|string|max:150|unique:conceptos_pedido,nombre',
            'descripcion' => 'nullable|string|max:255',
        ]);

        $concepto = ConceptoPedido::create($data);

        return response()->json($concepto, 201);
    }

    public function show(ConceptoPedido $conceptoPedido)
    {
        return response()->json($conceptoPedido);
    }

    public function update(Request $request, ConceptoPedido $conceptoPedido)
    {
        $data = $request->validate([
            'nombre'      => 'required|string|max:150|unique:conceptos_pedido,nombre,' . $conceptoPedido->id,
            'descripcion' => 'nullable|string|max:255',
        ]);

        $conceptoPedido->update($data);

        return response()->json($conceptoPedido->fresh());
    }

    public function destroy(ConceptoPedido $conceptoPedido)
    {
        $conceptoPedido->delete();
        return response()->json(null, 204);
    }
}
