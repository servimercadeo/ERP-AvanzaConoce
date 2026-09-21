<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FormaPago;
use Illuminate\Http\Request;

class FormaPagoController extends Controller
{
    public function index(Request $request)
    {
        $query = FormaPago::query();

        if ($request->search) {
            $query->where('nombre', 'like', "%{$request->search}%");
        }

        return response()->json($query->orderBy('nombre')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:100|unique:formas_pago,nombre',
        ]);

        $forma = FormaPago::create($data);

        return response()->json($forma, 201);
    }

    public function show(FormaPago $formaPago)
    {
        return response()->json($formaPago);
    }

    public function update(Request $request, FormaPago $formaPago)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:100|unique:formas_pago,nombre,' . $formaPago->id,
        ]);

        $formaPago->update($data);

        return response()->json($formaPago->fresh());
    }

    public function destroy(FormaPago $formaPago)
    {
        $formaPago->delete();
        return response()->json(null, 204);
    }
}
