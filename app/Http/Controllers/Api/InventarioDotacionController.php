<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventarioDotacion;
use App\Models\Proyecto;
use Illuminate\Http\Request;

const GENEROS_DOTACION = ['Masculino', 'Femenino', 'Unisex'];

class InventarioDotacionController extends Controller
{
    /** Fuente única de verdad: las claves de InventarioDotacion::PROYECTO_DOTACION_A_PROYECTO. */
    public static function proyectosDotacion(): array
    {
        return array_keys(InventarioDotacion::PROYECTO_DOTACION_A_PROYECTO);
    }

    private function sedeIdsValidasParaProyecto(string $proyectoDotacion): array
    {
        $nombreProyecto = InventarioDotacion::PROYECTO_DOTACION_A_PROYECTO[$proyectoDotacion] ?? null;
        if (!$nombreProyecto) {
            return [];
        }

        $proyecto = Proyecto::where('nombre', $nombreProyecto)->first();
        if (!$proyecto) {
            return [];
        }

        return $proyecto->sedes()->pluck('sedes.id')->all();
    }

    public function sedesDisponibles(Request $request)
    {
        $request->validate([
            'proyecto' => 'required|in:' . implode(',', self::proyectosDotacion()),
        ]);

        $nombreProyecto = InventarioDotacion::PROYECTO_DOTACION_A_PROYECTO[$request->proyecto] ?? null;
        $proyecto = $nombreProyecto ? Proyecto::where('nombre', $nombreProyecto)->first() : null;

        if (!$proyecto) {
            return response()->json([]);
        }

        return response()->json(
            $proyecto->sedes()->orderBy('sedes.nombre')->get(['sedes.id', 'sedes.nombre'])
        );
    }

    private function validarSedeParaProyecto(?int $sedeId, string $proyecto): ?string
    {
        if ($sedeId === null) {
            return null;
        }

        if (!in_array($sedeId, $this->sedeIdsValidasParaProyecto($proyecto), true)) {
            return 'La sede seleccionada no pertenece al proyecto elegido.';
        }

        return null;
    }

    private function filtrarInventario(Request $request)
    {
        $query = InventarioDotacion::with('sede:id,nombre')
            ->orderBy('proyecto')
            ->orderBy('prenda')
            ->orderBy('genero')
            ->orderBy('talla');

        if ($request->filled('proyecto') && $request->proyecto !== 'Todos') {
            $query->where('proyecto', $request->proyecto);
        }

        if ($request->filled('sede_id') && $request->sede_id !== 'Todas') {
            $query->where('sede_id', $request->sede_id);
        }

        if ($request->filled('prenda') && $request->prenda !== 'Todos') {
            $query->where('prenda', $request->prenda);
        }

        if ($request->filled('genero') && $request->genero !== 'Todos') {
            $query->where('genero', $request->genero);
        }

        if ($request->filled('talla') && $request->talla !== 'Todos') {
            $query->where('talla', $request->talla);
        }

        if ($request->filled('search')) {
            $texto = '%' . $request->search . '%';
            $query->where(fn ($q) => $q
                ->where('prenda', 'like', $texto)
                ->orWhere('genero', 'like', $texto)
                ->orWhere('talla', 'like', $texto));
        }

        return $query;
    }

    private function serializarFila(InventarioDotacion $r): array
    {
        $item = $r->toArray();
        $item['sede_nombre'] = $r->sede->nombre ?? null;
        return $item;
    }

    /**
     * Devuelve el inventario filtrado. Sin `per_page` se comporta igual que siempre (arreglo
     * completo) — así PedidosAutomaticosCrud.jsx y PedidosGlobalesCrud.jsx, que piden el
     * catálogo entero sin paginar para buscar ítems por talla/género, no se ven afectados.
     * Con `per_page` pagina server-side, que es lo que usa ProductosDotacion.jsx.
     */
    public function index(Request $request)
    {
        $query = $this->filtrarInventario($request);

        if ($request->filled('per_page')) {
            $paginado = $query->paginate((int) $request->per_page);
            $paginado->getCollection()->transform(fn ($r) => $this->serializarFila($r));
            return response()->json($paginado);
        }

        return response()->json($query->get()->map(fn ($r) => $this->serializarFila($r)));
    }

    /** Totales por proyecto y conteo de items en stock bajo/crítico, para las tarjetas de stats. */
    public function resumen()
    {
        $filas = InventarioDotacion::selectRaw('proyecto, SUM(cantidad) as total, SUM(CASE WHEN stock_minimo > 0 AND cantidad <= stock_minimo THEN 1 ELSE 0 END) as bajo_stock')
            ->groupBy('proyecto')
            ->get();

        $porProyecto = $filas->pluck('total', 'proyecto');

        return response()->json([
            'total'        => (int) $filas->sum('total'),
            'bajoStock'    => (int) $filas->sum('bajo_stock'),
            'porProyecto'  => $porProyecto,
        ]);
    }

    /** Prendas y tallas distintas disponibles para el proyecto/sede/género elegidos, para los chips de filtro. */
    public function filtros(Request $request)
    {
        $base = fn () => InventarioDotacion::query()
            ->when($request->filled('proyecto') && $request->proyecto !== 'Todos', fn ($q) => $q->where('proyecto', $request->proyecto))
            ->when($request->filled('sede_id') && $request->sede_id !== 'Todas', fn ($q) => $q->where('sede_id', $request->sede_id));

        $prendas = $base()->distinct()->orderBy('prenda')->pluck('prenda');

        $tallas = $base()
            ->when($request->filled('prenda') && $request->prenda !== 'Todos', fn ($q) => $q->where('prenda', $request->prenda))
            ->when($request->filled('genero') && $request->genero !== 'Todos', fn ($q) => $q->where('genero', $request->genero))
            ->distinct()->pluck('talla');

        return response()->json(['prendas' => $prendas, 'tallas' => $tallas]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'proyecto'     => 'required|in:' . implode(',', self::proyectosDotacion()),
            'sede_id'      => 'nullable|integer|exists:sedes,id',
            'prenda'       => 'required|string|max:150',
            'genero'       => 'required|in:Masculino,Femenino,Unisex',
            'talla'        => 'required|string|max:10',
            'precio'       => 'nullable|integer|min:0',
            'cantidad'     => 'required|integer|min:0',
            'stock_minimo' => 'nullable|integer|min:0',
        ]);

        if ($error = $this->validarSedeParaProyecto($data['sede_id'] ?? null, $data['proyecto'])) {
            return response()->json(['message' => $error], 422);
        }

        $item = InventarioDotacion::updateOrCreate(
            [
                'proyecto' => $data['proyecto'],
                'sede_id'  => $data['sede_id'] ?? null,
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
            'items.*.proyecto'     => 'required|in:' . implode(',', self::proyectosDotacion()),
            'items.*.sede_id'      => 'nullable|integer|exists:sedes,id',
            'items.*.prenda'       => 'required|string|max:150',
            'items.*.genero'       => 'required|in:Masculino,Femenino,Unisex',
            'items.*.talla'        => 'required|string|max:10',
            'items.*.precio'       => 'nullable|integer|min:0',
            'items.*.cantidad'     => 'required|integer|min:0',
            'items.*.stock_minimo' => 'nullable|integer|min:0',
        ]);

        foreach ($request->items as $item) {
            if ($error = $this->validarSedeParaProyecto($item['sede_id'] ?? null, $item['proyecto'])) {
                return response()->json(['message' => $error], 422);
            }
        }

        $saved = 0;
        foreach ($request->items as $item) {
            InventarioDotacion::updateOrCreate(
                [
                    'proyecto' => $item['proyecto'],
                    'sede_id'  => $item['sede_id'] ?? null,
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
            'items.*.proyecto'     => 'required|in:' . implode(',', self::proyectosDotacion()),
            'items.*.sede_id'      => 'nullable|integer|exists:sedes,id',
            'items.*.prenda'       => 'required|string|max:150',
            'items.*.genero'       => 'required|in:Masculino,Femenino,Unisex',
            'items.*.talla'        => 'required|string|max:10',
            'items.*.precio'       => 'nullable|integer|min:0',
            'items.*.cantidad'     => 'required|integer|min:0',
            'items.*.stock_minimo' => 'nullable|integer|min:0',
        ]);

        foreach ($request->items as $item) {
            if ($error = $this->validarSedeParaProyecto($item['sede_id'] ?? null, $item['proyecto'])) {
                return response()->json(['message' => $error], 422);
            }
        }

        $creados = 0;
        $actualizados = 0;

        foreach ($request->items as $item) {
            $existente = InventarioDotacion::where([
                'proyecto' => $item['proyecto'],
                'sede_id'  => $item['sede_id'] ?? null,
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
                    'sede_id'      => $item['sede_id'] ?? null,
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
            'sede_id'      => 'nullable|integer|exists:sedes,id',
            'cantidad'     => 'required|integer|min:0',
            'stock_minimo' => 'nullable|integer|min:0',
            'precio'       => 'nullable|integer|min:0',
        ]);

        if (array_key_exists('sede_id', $data) && $error = $this->validarSedeParaProyecto($data['sede_id'], $inventarioDotacion->proyecto)) {
            return response()->json(['message' => $error], 422);
        }

        $inventarioDotacion->update([
            'sede_id'      => array_key_exists('sede_id', $data) ? $data['sede_id'] : $inventarioDotacion->sede_id,
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
