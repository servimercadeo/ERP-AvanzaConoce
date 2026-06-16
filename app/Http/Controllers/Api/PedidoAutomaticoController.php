<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PedidoAutomatico;
use Illuminate\Http\Request;

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
            if ($request->filled($filter) && !in_array($request->get($filter), ['Todos', 'Todas'], true)) {
                $query->where($filter, $request->get($filter));
            }
        }

        return response()->json(
            $query->orderByDesc('created_at')
                ->orderBy('apellidos')
                ->orderBy('nombres')
                ->get()
        );
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

    public function update(Request $request, PedidoAutomatico $pedidoAutomatico)
    {
        $pedidoAutomatico->update($this->validatedData($request));

        return response()->json($pedidoAutomatico->fresh());
    }

    public function destroy(PedidoAutomatico $pedidoAutomatico)
    {
        $pedidoAutomatico->delete();

        return response()->json(null, 204);
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
