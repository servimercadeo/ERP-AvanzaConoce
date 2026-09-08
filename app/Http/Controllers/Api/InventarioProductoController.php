<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventarioProducto;
use App\Models\Sede;
use App\Models\TipoProducto;
use Illuminate\Http\Request;

class InventarioProductoController extends Controller
{
    public function index(Request $request)
    {
        $query = InventarioProducto::with(['tipoProducto', 'sede']);

        if ($request->categoria) {
            $query->whereHas('tipoProducto', fn ($q) => $q->where('categoria', $request->categoria));
        }
        if ($request->sede_id) {
            $query->where('sede_id', $request->sede_id);
        }
        if ($request->search) {
            $s = $request->search;
            $query->whereHas('tipoProducto', fn ($q) => $q->where('nombre', 'like', "%{$s}%"));
        }

        return response()->json(
            $query->get()->map(fn (InventarioProducto $i) => $this->serializar($i))
        );
    }

    public function resumen(Request $request)
    {
        $query = InventarioProducto::query();
        if ($request->categoria) {
            $query->whereHas('tipoProducto', fn ($q) => $q->where('categoria', $request->categoria));
        }

        $items = $query->get(['cantidad', 'stock_minimo']);

        return response()->json([
            'total'     => $items->count(),
            'bajoStock' => $items->filter(fn ($i) => $i->stock_minimo > 0 && $i->cantidad <= $i->stock_minimo)->count(),
        ]);
    }

    public function sedesDisponibles()
    {
        return response()->json(Sede::orderBy('nombre')->get(['id', 'nombre']));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'tipo_producto_id' => 'required|exists:tipos_producto,id',
            'sede_id'          => 'required|exists:sedes,id',
            'precio'           => 'nullable|integer|min:0',
            'cantidad'         => 'required|integer|min:0',
            'stock_minimo'     => 'nullable|integer|min:0',
        ]);

        $existente = InventarioProducto::where('tipo_producto_id', $data['tipo_producto_id'])
            ->where('sede_id', $data['sede_id'])
            ->first();

        if ($existente) {
            $existente->increment('cantidad', $data['cantidad']);
            if (isset($data['precio'])) {
                $existente->precio = $data['precio'];
            }
            if (isset($data['stock_minimo'])) {
                $existente->stock_minimo = $data['stock_minimo'];
            }
            $existente->save();

            return response()->json($this->serializar($existente->fresh(['tipoProducto', 'sede'])), 200);
        }

        $item = InventarioProducto::create([
            'tipo_producto_id' => $data['tipo_producto_id'],
            'sede_id'          => $data['sede_id'],
            'precio'           => $data['precio'] ?? 0,
            'cantidad'         => $data['cantidad'],
            'stock_minimo'     => $data['stock_minimo'] ?? 0,
        ]);

        return response()->json($this->serializar($item->load(['tipoProducto', 'sede'])), 201);
    }

    public function update(Request $request, InventarioProducto $inventarioProducto)
    {
        $data = $request->validate([
            'precio'       => 'nullable|integer|min:0',
            'cantidad'     => 'required|integer|min:0',
            'stock_minimo' => 'nullable|integer|min:0',
        ]);

        $inventarioProducto->update([
            'precio'       => $data['precio'] ?? $inventarioProducto->precio,
            'cantidad'     => $data['cantidad'],
            'stock_minimo' => $data['stock_minimo'] ?? $inventarioProducto->stock_minimo,
        ]);

        return response()->json($this->serializar($inventarioProducto->fresh(['tipoProducto', 'sede'])));
    }

    public function destroy(InventarioProducto $inventarioProducto)
    {
        $inventarioProducto->delete();
        return response()->json(null, 204);
    }

    private function serializar(InventarioProducto $i): array
    {
        return [
            'id'           => $i->id,
            'tipo_producto_id' => $i->tipo_producto_id,
            'producto'     => $i->tipoProducto?->nombre,
            'categoria'    => $i->tipoProducto?->categoria,
            'sede_id'      => $i->sede_id,
            'sede'         => $i->sede?->nombre,
            'precio'       => $i->precio,
            'cantidad'     => $i->cantidad,
            'stock_minimo' => $i->stock_minimo,
        ];
    }
}
