<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidato;
use App\Models\Contrato;
use App\Models\InventarioDotacion;
use App\Models\PedidoAutomatico;
use App\Models\RespuestaIngreso;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PedidoAutomaticoController extends Controller
{
    public function index(Request $request)
    {
        $query = PedidoAutomatico::query();

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('cedula', 'like', "%{$search}%")
                    ->orWhere('nombres', 'like', "%{$search}%")
                    ->orWhere('apellidos', 'like', "%{$search}%")
                    ->orWhere('sede', 'like', "%{$search}%")
                    ->orWhere('cargo', 'like', "%{$search}%")
                    ->orWhere('pedido_inicial', 'like', "%{$search}%");
            });
        }

        foreach (['sede', 'estado_contrato', 'estado_acta', 'genero', 'cargo'] as $filter) {
            if ($request->filled($filter) && !in_array($request->input($filter), ['Todos', 'Todas'], true)) {
                $query->where($filter, $request->input($filter));
            }
        }

        $pedidos = $query->orderByDesc('created_at')->orderBy('apellidos')->orderBy('nombres')->get();

        // Enriquecer proyecto para registros que lo tengan vacío
        $sinProyecto = $pedidos->filter(fn($p) => empty($p->proyecto));
        if ($sinProyecto->isNotEmpty()) {
            $cedulas  = $sinProyecto->pluck('cedula')->unique()->values()->toArray();
            $users    = User::whereIn('cedula', $cedulas)->select('id', 'cedula')->get()->keyBy('cedula');
            $userIds  = $users->pluck('id')->toArray();
            $contratos = Contrato::whereIn('empleado_id', $userIds)
                ->orderByDesc('created_at')
                ->get()
                ->groupBy('empleado_id')
                ->map(fn($g) => $g->first()->cliente_proyecto);

            $pedidos = $pedidos->map(function ($p) use ($users, $contratos) {
                if (empty($p->proyecto)) {
                    $user = $users->get($p->cedula);
                    if ($user && $contratos->has($user->id)) {
                        $p->proyecto = $contratos->get($user->id);
                    }
                }
                return $p;
            });
        }

        return response()->json($pedidos->values());
    }

    public function options()
    {
        $pluck = fn($column) => PedidoAutomatico::query()
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->select($column)
            ->distinct()
            ->orderBy($column)
            ->pluck($column)
            ->values();

        return response()->json([
            'sedes' => $pluck('sede'),
            'estados_contrato' => $pluck('estado_contrato'),
            'estados_acta' => $pluck('estado_acta'),
            'generos' => $pluck('genero'),
            'cargos' => $pluck('cargo'),
        ]);
    }

    public function store(Request $request)
    {
        $pedidoAutomatico = PedidoAutomatico::create($this->validatedData($request));

        return response()->json($pedidoAutomatico, 201);
    }

    public function show(PedidoAutomatico $pedidoAutomatico)
    {
        return response()->json($pedidoAutomatico);
    }

    public function enriquecer(PedidoAutomatico $pedidoAutomatico)
    {
        $cedula    = $pedidoAutomatico->cedula;
        $data      = $pedidoAutomatico->toArray();

        $user      = User::where('cedula', $cedula)->first();
        $contrato  = $user
            ? Contrato::where('empleado_id', $user->id)->orderByDesc('created_at')->first()
            : null;
        $respuesta = RespuestaIngreso::where('documento', $cedula)->first();
        $candidato = Candidato::where('identificacion', $cedula)->first();

        $fill = function (string $field, array $sources) use (&$data): void {
            if (!empty($data[$field])) return;
            foreach ($sources as $val) {
                if ($val !== null && $val !== '') {
                    $data[$field] = $val;
                    return;
                }
            }
        };

        $fill('nombres',          [$user?->nombres]);
        $fill('apellidos',        [$user?->apellidos]);
        $fill('sede',             [$contrato?->sede, $user?->sede]);
        $fill('cargo',            [$contrato?->cargo, $user?->cargo]);
        $fill('tipo_contrato',    [$contrato?->tipo_contrato, $contrato?->tipo_vinculacion, $user?->tipo_vinculacion]);
        $fill('estado_contrato',  [$contrato?->estado_contrato, $user?->estado_empleado]);
        $fill('empleador',        [$contrato?->empleador]);
        $fill('proyecto',         [$contrato?->cliente_proyecto]);
        $fill('ciudad',           [$respuesta?->ciudad]);
        $fill('fecha_ingreso',    [$contrato?->fecha_ingreso?->format('Y-m-d')]);

        // Normalizar género para que coincida con los valores del select (Masculino/Femenino)
        $generoNorm = $this->normalizarGenero($data['genero'] ?? null)
            ?? $this->normalizarGenero($user?->genero)
            ?? $this->normalizarGenero($candidato?->genero ?? null);
        if ($generoNorm) $data['genero'] = $generoNorm;

        // Tallas desde RespuestaIngreso según género
        $esFemenino = ($data['genero'] ?? '') === 'Femenino';
        if ($esFemenino) {
            $fill('polo_femenino_talla',    [$respuesta?->talla_camisa]);
            $fill('jean_femenino_talla',    [$respuesta?->talla_pantalon]);
            $fill('tenis_femenino_talla',   [$respuesta?->talla_zapatos]);
        } else {
            $fill('polo_masculino_talla',   [$respuesta?->talla_camisa]);
            $fill('jean_masculino_talla',   [$respuesta?->talla_pantalon]);
            $fill('tenis_masculino_talla',  [$respuesta?->talla_zapatos]);
        }

        return response()->json($data);
    }

    private function normalizarGenero(?string $genero): ?string
    {
        if (!$genero) return null;
        $lower = strtolower($genero);
        if (str_starts_with($lower, 'f') || str_contains($lower, 'femen')) return 'Femenino';
        if (str_starts_with($lower, 'm') || str_contains($lower, 'masc'))  return 'Masculino';
        return null;
    }

    public function update(Request $request, PedidoAutomatico $pedidoAutomatico)
    {
        $data = $this->validatedData($request);
        $this->ajustarInventarioPorEdicion($pedidoAutomatico, $data);
        $pedidoAutomatico->update($data);
        return response()->json($pedidoAutomatico->fresh());
    }

    private function ajustarInventarioPorEdicion(PedidoAutomatico $old, array $nuevo): void
    {
        $items = [
            ['Polo',     'Masculino', 'polo_masculino_talla',     'polo_masculino_cantidad'],
            ['Polo',     'Femenino',  'polo_femenino_talla',      'polo_femenino_cantidad'],
            ['Jean',     'Masculino', 'jean_masculino_talla',     'jean_masculino_cantidad'],
            ['Jean',     'Femenino',  'jean_femenino_talla',      'jean_femenino_cantidad'],
            ['Chaqueta', 'Masculino', 'chaqueta_masculino_talla', 'chaqueta_masculino_cantidad'],
            ['Chaqueta', 'Femenino',  'chaqueta_femenino_talla',  'chaqueta_femenino_cantidad'],
            ['Tenis',    'Masculino', 'tenis_masculino_talla',    'tenis_masculino_cantidad'],
            ['Tenis',    'Femenino',  'tenis_femenino_talla',     'tenis_femenino_cantidad'],
        ];

        foreach ($items as [$cat, $gen, $tallaKey, $cantKey]) {
            $oldTalla = $old->{$tallaKey};
            $oldCant  = (int) ($old->{$cantKey} ?? 0);
            $newTalla = $nuevo[$tallaKey] ?? null;
            $newCant  = (int) ($nuevo[$cantKey] ?? 0);

            // Sin tallas involucradas o sin cambio real
            if (!$oldTalla && !$newTalla) continue;
            if ($oldTalla === $newTalla && $oldCant === $newCant) continue;

            if ($oldTalla === $newTalla) {
                // Misma talla, solo cambió la cantidad
                $diff = $newCant - $oldCant;
                if ($diff === 0) continue;
                $inv = InventarioDotacion::where('categoria', $cat)
                    ->where('genero', $gen)
                    ->where('talla', $newTalla)
                    ->first();
                if (!$inv) continue;
                if ($diff > 0) {
                    $inv->decrement('cantidad', $diff);   // tomando más
                } else {
                    $inv->increment('cantidad', abs($diff)); // devolviendo
                }
            } else {
                // Talla cambió: devolver lo viejo, tomar lo nuevo
                if ($oldTalla && $oldCant > 0) {
                    $invOld = InventarioDotacion::where('categoria', $cat)
                        ->where('genero', $gen)
                        ->where('talla', $oldTalla)
                        ->first();
                    $invOld?->increment('cantidad', $oldCant);
                }
                if ($newTalla && $newCant > 0) {
                    $invNew = InventarioDotacion::where('categoria', $cat)
                        ->where('genero', $gen)
                        ->where('talla', $newTalla)
                        ->first();
                    $invNew?->decrement('cantidad', $newCant);
                }
            }
        }
    }

    public function destroy(PedidoAutomatico $pedidoAutomatico)
    {
        try {
            $pedidoAutomatico->delete();
            return response()->json(null, 204);
        } catch (\Exception $e) {
            Log::error('PedidoAutomatico delete failed id=' . $pedidoAutomatico->getKey() . ': ' . $e->getMessage());
            return response()->json(['message' => 'No se pudo eliminar el registro.'], 500);
        }
    }

    private function validatedData(Request $request): array
    {
        $data = $request->validate([
            'sede' => 'nullable|string|max:180',
            'cedula' => 'required|string|max:30',
            'nombres' => 'required|string|max:150',
            'apellidos' => 'required|string|max:150',
            'cargo' => 'nullable|string|max:150',
            'tipo_contrato' => 'nullable|string|max:80',
            'proceso' => 'nullable|string|max:80',
            'fecha_ingreso' => 'nullable|date',
            'estado_contrato' => 'nullable|string|max:80',
            'empleador' => 'nullable|string|max:150',
            'proyecto' => 'nullable|string|max:120',
            'genero' => 'nullable|string|max:30',
            'ciudad' => 'nullable|string|max:120',
            'polo_masculino_talla' => 'nullable|string|max:20',
            'polo_masculino_cantidad' => 'nullable|integer|min:0',
            'polo_femenino_talla' => 'nullable|string|max:20',
            'polo_femenino_cantidad' => 'nullable|integer|min:0',
            'jean_masculino_talla' => 'nullable|string|max:20',
            'jean_masculino_cantidad' => 'nullable|integer|min:0',
            'jean_femenino_talla' => 'nullable|string|max:20',
            'jean_femenino_cantidad' => 'nullable|integer|min:0',
            'chaqueta_masculino_talla' => 'nullable|string|max:20',
            'chaqueta_masculino_cantidad' => 'nullable|integer|min:0',
            'chaqueta_femenino_talla' => 'nullable|string|max:20',
            'chaqueta_femenino_cantidad' => 'nullable|integer|min:0',
            'tenis_masculino_talla' => 'nullable|string|max:20',
            'tenis_masculino_cantidad' => 'nullable|integer|min:0',
            'tenis_femenino_talla' => 'nullable|string|max:20',
            'tenis_femenino_cantidad' => 'nullable|integer|min:0',
            'estado_acta' => 'nullable|string|max:40',
            'actas_sept' => 'nullable|string|max:40',
            'fecha_segunda_renovacion_2025' => 'nullable|date',
            'fecha_primera_renovacion_2024' => 'nullable|date',
            'fecha_segunda_renovacion_2024' => 'nullable|date',
            'fecha_tercera_renovacion_2024' => 'nullable|date',
            'fecha_primera_renovacion_2025' => 'nullable|date',
            'pedido_inicial' => 'nullable|string|max:50',
            'fecha_inicial' => 'nullable|date',
            'pedido_renovacion_1' => 'nullable|string|max:50',
            'fecha_renovacion_1' => 'nullable|string|max:80',
            'pedido_renovacion_2' => 'nullable|string|max:50',
            'fecha_renovacion_2' => 'nullable|string|max:80',
            'pedido_renovacion_3' => 'nullable|string|max:50',
            'fecha_renovacion_3' => 'nullable|string|max:80',
            'pedido_renovacion_4' => 'nullable|string|max:50',
            'fecha_renovacion_4' => 'nullable|string|max:80',
            'pedido_renovacion_5' => 'nullable|string|max:50',
            'fecha_renovacion_5' => 'nullable|string|max:80',
        ]);

        return array_map(function ($value) {
            return $value === '' ? null : $value;
        }, $data);
    }
}
