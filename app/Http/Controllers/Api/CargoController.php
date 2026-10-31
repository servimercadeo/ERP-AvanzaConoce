<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cargo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Parámetros > Cargos: el catálogo `cargos` que usan los selects de cargo de Contratos,
 * Empleados, Seguimiento Médico, Base de Ingreso y Selección (cargo requerido y cargo del
 * solicitante de la requisición). Un cargo creado aquí sale en todos ellos. La columna
 * `en_requisicion` ya no filtra nada (la requisición ofrece el catálogo completo).
 *
 * Contratos y empleados guardan el cargo como TEXTO (contratos.cargo, users.cargo), no por
 * id: por eso un renombre se propaga a ellos y un cargo en uso no se elimina. Las
 * requisiciones sí lo enlazan por id (requisiciones.cargo_id).
 */
class CargoController extends Controller
{
    private const MENSAJES = [
        'nombre.required' => 'Escribe el nombre del cargo.',
        'nombre.max'      => 'El nombre admite máximo 150 caracteres.',
        'nombre.unique'   => 'Ya existe un cargo con ese nombre.',
    ];

    public function index(Request $request)
    {
        $usos = $this->usos();

        $cargos = Cargo::query()
            ->when($request->search, fn ($q, $s) => $q->where('nombre', 'like', "%{$s}%"))
            ->orderBy('nombre')
            ->get()
            ->each(function (Cargo $c) use ($usos) {
                $clave = self::clave($c->nombre);
                $c->setAttribute('contratos_count', $usos['contratos'][$clave] ?? 0);
                $c->setAttribute('empleados_count', $usos['empleados'][$clave] ?? 0);
                $c->setAttribute('requisiciones_count', $usos['requisiciones'][$c->id] ?? 0);
            });

        return response()->json($cargos);
    }

    public function store(Request $request)
    {
        $data = $this->validar($request);

        // `cargos.id` no es autoincremental (los ids vienen del catálogo original).
        $cargo = DB::transaction(function () use ($data) {
            $id = (int) Cargo::lockForUpdate()->max('id') + 1;
            return Cargo::create(['id' => $id] + $data);
        });

        return response()->json($cargo, 201);
    }

    public function update(Request $request, Cargo $cargo)
    {
        $data = $this->validar($request, $cargo);
        $anterior = $cargo->nombre;

        DB::transaction(function () use ($cargo, $data, $anterior) {
            $cargo->update($data);
            // Renombre: los contratos y empleados que tenían el nombre anterior quedan con el
            // nuevo (si no, en sus formularios el cargo ya no coincidiría con el catálogo).
            if (self::clave($anterior) !== self::clave($cargo->nombre)) {
                DB::table('contratos')->whereRaw('UPPER(TRIM(cargo)) = ?', [self::clave($anterior)])->update(['cargo' => $cargo->nombre]);
                DB::table('users')->whereRaw('UPPER(TRIM(cargo)) = ?', [self::clave($anterior)])->update(['cargo' => $cargo->nombre]);
            }
        });

        return response()->json($cargo->fresh());
    }

    public function destroy(Cargo $cargo)
    {
        $clave = self::clave($cargo->nombre);
        $usos = array_filter([
            'contratos'     => DB::table('contratos')->whereRaw('UPPER(TRIM(cargo)) = ?', [$clave])->count(),
            'empleados'     => DB::table('users')->whereRaw('UPPER(TRIM(cargo)) = ?', [$clave])->count(),
            'requisiciones' => DB::table('requisiciones')->where('cargo_id', $cargo->id)->count(),
        ]);
        if ($usos) {
            $detalle = collect($usos)->map(fn ($n, $donde) => "$n $donde")->implode(', ');
            return response()->json([
                'message' => "No se puede eliminar «{$cargo->nombre}»: está en uso ({$detalle}).",
            ], 422);
        }

        $cargo->delete();

        return response()->json(null, 204);
    }

    private function validar(Request $request, ?Cargo $cargo = null): array
    {
        $request->merge(['nombre' => mb_strtoupper(preg_replace('/\s+/', ' ', trim((string) $request->input('nombre'))), 'UTF-8')]);

        $data = $request->validate([
            'nombre'         => ['required', 'string', 'max:150', Rule::unique('cargos', 'nombre')->ignore($cargo?->id)],
            'en_requisicion' => 'sometimes|boolean',
        ], self::MENSAJES);
        // Un cargo nuevo sale en todos los selects, también en "Cargo requerido" de la
        // requisición; al editar se conserva lo que tenía.
        $data['en_requisicion'] = (bool) ($data['en_requisicion'] ?? $cargo?->en_requisicion ?? true);

        return $data;
    }

    /** Cuántos contratos / empleados / requisiciones usan cada cargo. */
    private function usos(): array
    {
        $porNombre = fn (string $tabla) => DB::table($tabla)->whereNotNull('cargo')
            ->selectRaw('UPPER(TRIM(cargo)) as clave, COUNT(*) as n')->groupBy('clave')->pluck('n', 'clave')->all();

        return [
            'contratos'     => $porNombre('contratos'),
            'empleados'     => $porNombre('users'),
            'requisiciones' => DB::table('requisiciones')->whereNotNull('cargo_id')
                ->selectRaw('cargo_id, COUNT(*) as n')->groupBy('cargo_id')->pluck('n', 'cargo_id')->all(),
        ];
    }

    private static function clave(?string $nombre): string
    {
        return mb_strtoupper(trim((string) $nombre), 'UTF-8');
    }
}
