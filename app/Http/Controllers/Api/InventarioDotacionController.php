<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventarioDotacion;
use Illuminate\Http\Request;

const PROYECTOS_DOTACION = ['TIGO EXPRESS', 'DIRECTV CO', 'Administrativo'];
const GENEROS_DOTACION   = ['Masculino', 'Femenino', 'Unisex'];

class InventarioDotacionController extends Controller
{
    public function index(Request $request)
    {
        $query = InventarioDotacion::orderBy('proyecto')
            ->orderBy('categoria')
            ->orderBy('subcategoria')
            ->orderBy('genero')
            ->orderBy('talla');

        if ($request->filled('proyecto') && $request->proyecto !== 'Todos') {
            $query->where('proyecto', $request->proyecto);
        }

        $rows = $query->get();

        if ($request->boolean('flat')) {
            return response()->json($rows);
        }

        $items = $rows
            ->groupBy(fn ($r) => $r->proyecto . '|' . $r->categoria . '|' . $r->subcategoria . '|' . $r->genero)
            ->map(function ($group) {
                $first = $group->first();
                return [
                    'id'           => $first->id,
                    'proyecto'     => $first->proyecto,
                    'categoria'    => $first->categoria,
                    'subcategoria' => $first->subcategoria,
                    'genero'       => $first->genero,
                    'tallas'       => $group->mapWithKeys(fn ($r) => [$r->talla => ['id' => $r->id, 'cantidad' => $r->cantidad]]),
                    'stock_total'  => $group->sum('cantidad'),
                    'stock_minimo' => $first->stock_minimo,
                    'ids'          => $group->pluck('id'),
                ];
            })
            ->values();

        return response()->json($items);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'proyecto'     => 'required|in:TIGO EXPRESS,DIRECTV CO,Administrativo',
            'categoria'    => 'required|string|max:60',
            'subcategoria' => 'required|string|max:80',
            'genero'       => 'required|in:Masculino,Femenino,Unisex',
            'talla'        => 'required|string|max:10',
            'cantidad'     => 'required|integer|min:0',
            'stock_minimo' => 'nullable|integer|min:0',
        ]);

        $item = InventarioDotacion::updateOrCreate(
            [
                'proyecto'     => $data['proyecto'],
                'categoria'    => $data['categoria'],
                'subcategoria' => $data['subcategoria'],
                'genero'       => $data['genero'],
                'talla'        => $data['talla'],
            ],
            [
                'cantidad'     => $data['cantidad'],
                'stock_minimo' => $data['stock_minimo'] ?? 0,
            ]
        );

        return response()->json($item, 201);
    }

    public function storeBulk(Request $request)
    {
        $request->validate([
            'items'                => 'required|array|min:1',
            'items.*.proyecto'     => 'required|in:TIGO EXPRESS,DIRECTV CO,Administrativo',
            'items.*.categoria'    => 'required|string|max:60',
            'items.*.subcategoria' => 'required|string|max:80',
            'items.*.genero'       => 'required|in:Masculino,Femenino,Unisex',
            'items.*.talla'        => 'required|string|max:10',
            'items.*.cantidad'     => 'required|integer|min:0',
            'items.*.stock_minimo' => 'nullable|integer|min:0',
        ]);

        $saved = 0;
        foreach ($request->items as $item) {
            InventarioDotacion::updateOrCreate(
                [
                    'proyecto'     => $item['proyecto'],
                    'categoria'    => $item['categoria'],
                    'subcategoria' => $item['subcategoria'],
                    'genero'       => $item['genero'],
                    'talla'        => $item['talla'],
                ],
                [
                    'cantidad'     => $item['cantidad'],
                    'stock_minimo' => $item['stock_minimo'] ?? 0,
                ]
            );
            $saved++;
        }

        return response()->json(['saved' => $saved]);
    }

    public function update(Request $request, InventarioDotacion $inventarioDotacion)
    {
        $data = $request->validate([
            'cantidad'     => 'required|integer|min:0',
            'stock_minimo' => 'nullable|integer|min:0',
        ]);

        $inventarioDotacion->update([
            'cantidad'     => $data['cantidad'],
            'stock_minimo' => $data['stock_minimo'] ?? $inventarioDotacion->stock_minimo,
        ]);

        return response()->json($inventarioDotacion);
    }

    public function destroy(InventarioDotacion $inventarioDotacion)
    {
        $inventarioDotacion->delete();
        return response()->json(null, 204);
    }
}
