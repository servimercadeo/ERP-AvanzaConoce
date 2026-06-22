<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventarioDotacion;

class InventarioDotacionController extends Controller
{
    public function index(\Illuminate\Http\Request $request)
    {
        if ($request->boolean('flat')) {
            return response()->json(
                InventarioDotacion::orderBy('categoria')
                    ->orderBy('subcategoria')
                    ->orderBy('genero')
                    ->orderBy('talla')
                    ->get()
            );
        }

        $rows = InventarioDotacion::orderBy('categoria')
            ->orderBy('subcategoria')
            ->orderBy('genero')
            ->orderBy('talla')
            ->get();

        $items = $rows
            ->groupBy(fn ($row) => $row->categoria . '|' . $row->subcategoria . '|' . $row->genero)
            ->map(function ($group) {
                $first = $group->first();

                return [
                    'id' => $first->id,
                    'categoria' => $first->categoria,
                    'subcategoria' => $first->subcategoria,
                    'genero' => $first->genero,
                    'tallas' => $group->mapWithKeys(fn ($row) => [$row->talla => $row->cantidad]),
                    'stock_total' => $group->sum('cantidad'),
                    'stock_minimo' => $first->stock_minimo,
                ];
            })
            ->values();

        return response()->json($items);
    }
}
