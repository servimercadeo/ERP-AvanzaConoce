<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Proveedor;
use Illuminate\Http\Request;

class ProveedorController extends Controller
{
    public function index(Request $request)
    {
        $query = Proveedor::query();

        if ($request->search) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nombre', 'like', "%{$s}%")
                    ->orWhere('nit', 'like', "%{$s}%");
            });
        }

        return response()->json($query->orderBy('nombre')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nit'        => 'required|string|max:20|unique:proveedores,nit',
            'naturaleza' => 'required|string|in:JURIDICA,NATURAL,GRAN CONTRIBUYENTE',
            'nombre'     => 'required|string|max:200',
        ]);

        $proveedor = Proveedor::create($data);

        return response()->json($proveedor, 201);
    }

    public function show(Proveedor $proveedor)
    {
        return response()->json($proveedor);
    }

    public function update(Request $request, Proveedor $proveedor)
    {
        $data = $request->validate([
            'nit'        => 'required|string|max:20|unique:proveedores,nit,' . $proveedor->id,
            'naturaleza' => 'required|string|in:JURIDICA,NATURAL,GRAN CONTRIBUYENTE',
            'nombre'     => 'required|string|max:200',
        ]);

        $proveedor->update($data);

        return response()->json($proveedor->fresh());
    }

    public function destroy(Proveedor $proveedor)
    {
        $proveedor->delete();
        return response()->json(null, 204);
    }
}
