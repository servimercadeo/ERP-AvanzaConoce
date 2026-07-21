<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventarioDotacion;
use Illuminate\Http\Request;

const PROYECTOS_DOTACION = ['SYM TIGO EXPRESS', 'SYM TIGO HOME', 'SYM ADMINISTRATIVO', 'DIRECTV'];
const GENEROS_DOTACION   = ['Masculino', 'Femenino', 'Unisex'];

class InventarioDotacionController extends Controller
{
    public function index(Request $request)
    {
        $query = InventarioDotacion::orderBy('proyecto')
            ->orderBy('prenda')
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
            ->groupBy(fn ($r) => $r->proyecto . '|' . $r->prenda . '|' . $r->genero)
            ->map(function ($group) {
                $first = $group->first();
                return [
                    'id'           => $first->id,
                    'proyecto'     => $first->proyecto,
                    'prenda'       => $first->prenda,
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
            'proyecto'     => 'required|in:' . implode(',', PROYECTOS_DOTACION),
            'prenda'       => 'required|string|max:150',
            'genero'       => 'required|in:Masculino,Femenino,Unisex',
            'talla'        => 'required|string|max:10',
            'precio'       => 'nullable|integer|min:0',
            'cantidad'     => 'required|integer|min:0',
            'stock_minimo' => 'nullable|integer|min:0',
        ]);

        $item = InventarioDotacion::updateOrCreate(
            [
                'proyecto' => $data['proyecto'],
                'prenda'   => $data['prenda'],
                'genero'   => $data['genero'],
                'talla'    => $data['talla'],
            ],
            [
                'precio'       => $data['precio'] ?? 0,
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
            'items.*.proyecto'     => 'required|in:' . implode(',', PROYECTOS_DOTACION),
            'items.*.prenda'       => 'required|string|max:150',
            'items.*.genero'       => 'required|in:Masculino,Femenino,Unisex',
            'items.*.talla'        => 'required|string|max:10',
            'items.*.precio'       => 'nullable|integer|min:0',
            'items.*.cantidad'     => 'required|integer|min:0',
            'items.*.stock_minimo' => 'nullable|integer|min:0',
        ]);

        $saved = 0;
        foreach ($request->items as $item) {
            InventarioDotacion::updateOrCreate(
                [
                    'proyecto' => $item['proyecto'],
                    'prenda'   => $item['prenda'],
                    'genero'   => $item['genero'],
                    'talla'    => $item['talla'],
                ],
                [
                    'precio'       => $item['precio'] ?? 0,
                    'cantidad'     => $item['cantidad'],
                    'stock_minimo' => $item['stock_minimo'] ?? 0,
                ]
            );
            $saved++;
        }

        return response()->json(['saved' => $saved]);
    }

    public function import(Request $request)
    {
        $request->validate([
            'items'                => 'required|array|min:1',
            'items.*.proyecto'     => 'required|in:' . implode(',', PROYECTOS_DOTACION),
            'items.*.prenda'       => 'required|string|max:150',
            'items.*.genero'       => 'required|in:Masculino,Femenino,Unisex',
            'items.*.talla'        => 'required|string|max:10',
            'items.*.precio'       => 'nullable|integer|min:0',
            'items.*.cantidad'     => 'required|integer|min:0',
            'items.*.stock_minimo' => 'nullable|integer|min:0',
        ]);

        $creados = 0;
        $actualizados = 0;

        foreach ($request->items as $item) {
            $existente = InventarioDotacion::where([
                'proyecto' => $item['proyecto'],
                'prenda'   => $item['prenda'],
                'genero'   => $item['genero'],
                'talla'    => $item['talla'],
            ])->first();

            if ($existente) {
                $existente->increment('cantidad', $item['cantidad']);
                $actualizados++;
            } else {
                InventarioDotacion::create([
                    'proyecto'     => $item['proyecto'],
                    'prenda'       => $item['prenda'],
                    'genero'       => $item['genero'],
                    'talla'        => $item['talla'],
                    'precio'       => $item['precio'] ?? 0,
                    'cantidad'     => $item['cantidad'],
                    'stock_minimo' => $item['stock_minimo'] ?? 10,
                ]);
                $creados++;
            }
        }

        return response()->json(['creados' => $creados, 'actualizados' => $actualizados]);
    }

    public function update(Request $request, InventarioDotacion $inventarioDotacion)
    {
        $data = $request->validate([
            'cantidad'     => 'required|integer|min:0',
            'stock_minimo' => 'nullable|integer|min:0',
            'precio'       => 'nullable|integer|min:0',
        ]);

        $inventarioDotacion->update([
            'cantidad'     => $data['cantidad'],
            'stock_minimo' => $data['stock_minimo'] ?? $inventarioDotacion->stock_minimo,
            'precio'       => $data['precio'] ?? $inventarioDotacion->precio,
        ]);

        return response()->json($inventarioDotacion);
    }

    public function destroy(InventarioDotacion $inventarioDotacion)
    {
        $inventarioDotacion->delete();
        return response()->json(null, 204);
    }
}
