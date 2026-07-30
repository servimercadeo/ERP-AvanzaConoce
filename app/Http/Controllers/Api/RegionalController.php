<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Regional;
use Illuminate\Http\Request;

class RegionalController extends Controller
{
    public function index(Request $request)
    {
        $query = Regional::query();

        if ($request->search) {
            $query->where('nombre', 'like', "%{$request->search}%");
        }

        return response()->json($query->orderBy('nombre')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre'      => 'required|string|max:100|unique:regionales,nombre',
            'descripcion' => 'nullable|string|max:255',
        ]);

        $regional = Regional::create($data);

        return response()->json($regional, 201);
    }

    public function show(Regional $regional)
    {
        return response()->json($regional);
    }

    public function update(Request $request, Regional $regional)
    {
        $data = $request->validate([
            'nombre'      => 'required|string|max:100|unique:regionales,nombre,' . $regional->id,
            'descripcion' => 'nullable|string|max:255',
        ]);

        $regional->update($data);

        return response()->json($regional->fresh());
    }

    public function destroy(Regional $regional)
    {
        $regional->delete();
        return response()->json(null, 204);
    }
}
