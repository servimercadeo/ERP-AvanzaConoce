<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventarioProducto;
use App\Models\InventarioProductoSerie;
use App\Models\Sede;
use App\Models\TipoProducto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventarioProductoController extends Controller
{
    public function index(Request $request)
    {
        $query = InventarioProducto::with(['tipoProducto', 'sede', 'series', 'empresa']);

        if ($request->categoria) {
            $query->whereHas('tipoProducto', fn ($q) => $q->where('categoria', $request->categoria));
        }
        if ($request->sede_id) {
            $query->where('sede_id', $request->sede_id);
        }
        if ($request->search) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->whereHas('tipoProducto', fn ($q2) => $q2->where('nombre', 'like', "%{$s}%"))
                    ->orWhereHas('sede', fn ($q2) => $q2->where('nombre', 'like', "%{$s}%"));
            });
        }

        // Hay 90+ sedes: un mismo producto puede tener una fila por cada una. Se ordena
        // por producto y luego por sede para que, aunque el front recorte resultados, se
        // vean agrupadas y completas las sedes de un mismo producto en vez de un
        // subconjunto arbitrario según el orden de inserción en la BD.
        $items = $query->get()->sortBy(fn (InventarioProducto $i) => ($i->tipoProducto?->nombre ?? '') . '|' . ($i->sede?->nombre ?? ''))->values();

        return response()->json(
            $items->map(fn (InventarioProducto $i) => $this->serializar($i))
        );
    }

    public function resumen(Request $request)
    {
        $query = InventarioProducto::query();
        if ($request->categoria) {
            $query->whereHas('tipoProducto', fn ($q) => $q->where('categoria', $request->categoria));
        }

        return response()->json([
            'total' => $query->count(),
        ]);
    }

    public function sedesDisponibles()
    {
        return response()->json(Sede::orderBy('nombre')->get(['id', 'nombre']));
    }

    /**
     * "Serializado" es una decisión ad-hoc por cada carga de stock (el check en el
     * formulario), no una propiedad fija del tipo de producto: al crear/agregar stock,
     * los seriales que llegan en la petición son los de las unidades NUEVAS que se están
     * agregando ahora mismo, así que siempre se agregan (nunca reemplazan) a los que ya
     * tuviera ese item.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'tipo_producto_id' => 'required|exists:tipos_producto,id',
            'sede_id'          => 'required|exists:sedes,id',
            'talla'            => 'nullable|string|max:50',
            'empresa_id'       => 'nullable|exists:empresas,id',
            'precio'           => 'nullable|integer|min:0',
            'cantidad'         => 'required|integer|min:0',
            'stock_minimo'     => 'nullable|integer|min:0',
            'series'           => 'nullable|array',
            'series.*'         => 'string|max:100|distinct',
        ]);
        $talla = trim($data['talla'] ?? '');
        $empresaId = $data['empresa_id'] ?? null;

        $series = array_values(array_filter(array_map('trim', $data['series'] ?? [])));
        if (!empty($series) && count($series) !== $data['cantidad']) {
            throw ValidationException::withMessages([
                'series' => 'La cantidad de seriales (' . count($series) . ') no coincide con la cantidad a agregar (' . $data['cantidad'] . ').',
            ]);
        }
        if (!empty($series)) {
            $this->validarSerialesUnicos($series);
        }

        return DB::transaction(function () use ($data, $series, $talla, $empresaId) {
            $existente = InventarioProducto::where('tipo_producto_id', $data['tipo_producto_id'])
                ->where('sede_id', $data['sede_id'])
                ->where('talla', $talla)
                ->when($empresaId, fn ($q) => $q->where('empresa_id', $empresaId), fn ($q) => $q->whereNull('empresa_id'))
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
                $item = $existente;
            } else {
                $item = InventarioProducto::create([
                    'tipo_producto_id' => $data['tipo_producto_id'],
                    'sede_id'          => $data['sede_id'],
                    'talla'            => $talla,
                    'empresa_id'       => $empresaId,
                    'precio'           => $data['precio'] ?? 0,
                    'cantidad'         => $data['cantidad'],
                    'stock_minimo'     => $data['stock_minimo'] ?? 0,
                ]);
            }

            foreach ($series as $serial) {
                $item->series()->create(['serial' => $serial]);
            }

            return response()->json(
                $this->serializar($item->fresh(['tipoProducto', 'sede', 'series', 'empresa'])),
                $existente ? 200 : 201
            );
        });
    }

    /**
     * A diferencia de store(), aquí "series" (cuando viene en la petición, aunque sea un
     * arreglo vacío) reemplaza por completo el conjunto actual: es la forma de corregir un
     * registro existente (agregar, quitar o editar seriales), no de sumar unidades nuevas.
     * Si la clave "series" no viene en la petición, los seriales existentes no se tocan.
     */
    public function update(Request $request, InventarioProducto $inventarioProducto)
    {
        $data = $request->validate([
            'precio'       => 'nullable|integer|min:0',
            'cantidad'     => 'required|integer|min:0',
            'stock_minimo' => 'nullable|integer|min:0',
            'series'       => 'nullable|array',
            'series.*'     => 'string|max:100|distinct',
        ]);

        $reemplazaSeries = $request->has('series');
        $series = $reemplazaSeries
            ? array_values(array_filter(array_map('trim', $data['series'] ?? [])))
            : null;

        if ($reemplazaSeries && !empty($series) && count($series) !== $data['cantidad']) {
            throw ValidationException::withMessages([
                'series' => 'La cantidad de seriales (' . count($series) . ') no coincide con la cantidad (' . $data['cantidad'] . ').',
            ]);
        }
        if ($reemplazaSeries && !empty($series)) {
            $this->validarSerialesUnicos($series, $inventarioProducto->id);
        }

        return DB::transaction(function () use ($data, $series, $reemplazaSeries, $inventarioProducto) {
            $inventarioProducto->update([
                'precio'       => $data['precio'] ?? $inventarioProducto->precio,
                'cantidad'     => $data['cantidad'],
                'stock_minimo' => $data['stock_minimo'] ?? $inventarioProducto->stock_minimo,
            ]);

            if ($reemplazaSeries) {
                $inventarioProducto->series()->delete();
                foreach ($series as $serial) {
                    $inventarioProducto->series()->create(['serial' => $serial]);
                }
            }

            return response()->json($this->serializar($inventarioProducto->fresh(['tipoProducto', 'sede', 'series', 'empresa'])));
        });
    }

    public function destroy(InventarioProducto $inventarioProducto)
    {
        $inventarioProducto->delete();
        return response()->json(null, 204);
    }

    /**
     * Importación masiva desde Excel (el frontend ya parseó el archivo y resolvió
     * cada nombre de producto/sede a su id real contra el mismo catálogo que ve el
     * usuario). Es todo o nada: si CUALQUIER fila tiene un problema (producto de otra
     * categoría, seriales que no cuadran con la cantidad, un serial repetido en el
     * archivo o que ya existe en el inventario), no se guarda absolutamente nada — se
     * devuelve la lista completa de errores para que se corrija el archivo y se
     * reintente, en vez de importar solo lo válido y dejar el resto a medias.
     */
    public function importar(Request $request)
    {
        $data = $request->validate([
            'categoria'                => 'nullable|string|max:100',
            'items'                    => 'required|array|min:1',
            'items.*.tipo_producto_id' => 'required|integer|exists:tipos_producto,id',
            'items.*.sede_id'          => 'required|integer|exists:sedes,id',
            'items.*.talla'            => 'nullable|string|max:50',
            'items.*.cantidad'         => 'required|integer|min:1',
            'items.*.series'           => 'nullable|array',
            'items.*.series.*'         => 'string|max:100',
        ]);

        $categoriaEsperada = $data['categoria'] ?? null;

        $tipos = TipoProducto::whereIn('id', array_column($data['items'], 'tipo_producto_id'))
            ->get(['id', 'nombre', 'categoria'])
            ->keyBy('id');

        $errores = [];
        $filasResueltas = [];
        $serialesEnArchivo = [];

        foreach ($data['items'] as $idx => $fila) {
            $numFila = $idx + 1;
            $tipo = $tipos->get($fila['tipo_producto_id']);

            if ($categoriaEsperada && $tipo && $tipo->categoria !== $categoriaEsperada) {
                $errores[] = "Fila {$numFila}: el producto \"{$tipo->nombre}\" no pertenece a la categoría \"{$categoriaEsperada}\".";
                continue;
            }

            $series = array_values(array_filter(array_map('trim', $fila['series'] ?? [])));
            if (!empty($series) && count($series) !== $fila['cantidad']) {
                $errores[] = "Fila {$numFila}: la cantidad de seriales no coincide con la cantidad ({$fila['cantidad']}).";
                continue;
            }

            $repetido = false;
            foreach ($series as $serial) {
                if (isset($serialesEnArchivo[$serial])) {
                    $errores[] = "Fila {$numFila}: el serial \"{$serial}\" está repetido en el archivo (ya aparece en la fila {$serialesEnArchivo[$serial]}).";
                    $repetido = true;
                    break;
                }
                $serialesEnArchivo[$serial] = $numFila;
            }
            if ($repetido) {
                continue;
            }

            $filasResueltas[] = [
                'tipo_producto_id' => $fila['tipo_producto_id'],
                'sede_id'          => $fila['sede_id'],
                'talla'            => trim($fila['talla'] ?? ''),
                'cantidad'         => $fila['cantidad'],
                'series'           => $series,
            ];
        }

        if (!empty($serialesEnArchivo)) {
            $existentes = InventarioProductoSerie::whereIn('serial', array_keys($serialesEnArchivo))->pluck('serial');
            if ($existentes->isNotEmpty()) {
                $errores[] = 'Estos seriales ya existen en el inventario: ' . $existentes->implode(', ');
            }
        }

        if (!empty($errores)) {
            return response()->json([
                'message' => 'No se pudo importar. Corrige estos problemas e inténtalo de nuevo.',
                'errores' => $errores,
            ], 422);
        }

        return DB::transaction(function () use ($filasResueltas) {
            $creados = 0;
            $actualizados = 0;

            foreach ($filasResueltas as $fila) {
                $existente = InventarioProducto::where('tipo_producto_id', $fila['tipo_producto_id'])
                    ->where('sede_id', $fila['sede_id'])
                    ->where('talla', $fila['talla'])
                    ->first();

                if ($existente) {
                    $existente->increment('cantidad', $fila['cantidad']);
                    $item = $existente;
                    $actualizados++;
                } else {
                    $item = InventarioProducto::create([
                        'tipo_producto_id' => $fila['tipo_producto_id'],
                        'sede_id'          => $fila['sede_id'],
                        'talla'            => $fila['talla'],
                        'cantidad'         => $fila['cantidad'],
                    ]);
                    $creados++;
                }

                foreach ($fila['series'] as $serial) {
                    $item->series()->create(['serial' => $serial]);
                }
            }

            return response()->json(['creados' => $creados, 'actualizados' => $actualizados]);
        });
    }

    /**
     * Un serial identifica una unidad física real: no puede repetirse en todo el
     * inventario, sin importar el producto o la sede. `$exceptoInventarioProductoId` deja
     * pasar los seriales que ya son del propio item que se está editando (si no, reenviar
     * sin cambios los seriales de un item chocaría contra sí mismo).
     */
    private function validarSerialesUnicos(array $seriales, ?int $exceptoInventarioProductoId = null): void
    {
        $duplicados = InventarioProductoSerie::whereIn('serial', $seriales)
            ->when($exceptoInventarioProductoId, fn ($q) => $q->where('inventario_producto_id', '!=', $exceptoInventarioProductoId))
            ->pluck('serial');

        if ($duplicados->isNotEmpty()) {
            throw ValidationException::withMessages([
                'series' => 'Estos seriales ya existen en otro producto: ' . $duplicados->implode(', '),
            ]);
        }
    }

    private function serializar(InventarioProducto $i): array
    {
        return [
            'id'           => $i->id,
            'tipo_producto_id' => $i->tipo_producto_id,
            'producto'     => $i->tipoProducto?->nombre,
            'categoria'    => $i->tipoProducto?->categoria,
            'talla'        => $i->talla ?: null,
            'sede_id'      => $i->sede_id,
            'sede'         => $i->sede?->nombre,
            'empresa_id'   => $i->empresa_id,
            'empresa'      => $i->empresa?->nombre,
            'precio'       => $i->precio,
            'cantidad'     => $i->cantidad,
            'stock_minimo' => $i->stock_minimo,
            'series'       => $i->series->pluck('serial')->values(),
        ];
    }
}
