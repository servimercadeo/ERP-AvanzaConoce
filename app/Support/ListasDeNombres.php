<?php

namespace App\Support;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Varias listas de nombres de catálogo (EPS, ARL, bancos...) en UNA consulta (UNION ALL)
 * en vez de una por lista: en producción cada consulta es un viaje a la BD (~60 ms).
 *
 * Cada lista sale ordenada por nombre y, si se pide, sin repetidos, igual que
 * `DB::table($tabla)->distinct()->orderBy('nombre')->pluck('nombre')`. La intercalación
 * se fija explícitamente para que el UNION funcione aunque alguna tabla de producción se
 * haya creado a mano con otra.
 */
class ListasDeNombres
{
    /**
     * @param  array<string, array{tabla: string, distinct?: bool, filtro?: callable}>  $listas
     * @return Collection<string, Collection<int, string>>  clave => nombres (vacía si no hay)
     */
    public static function traer(array $listas, string $columna = 'nombre'): Collection
    {
        $union = null;
        foreach ($listas as $clave => $def) {
            $q = DB::table($def['tabla'])
                ->selectRaw("? as k, CONVERT({$columna} USING utf8mb4) COLLATE utf8mb4_unicode_ci as v", [$clave]);
            if ($def['distinct'] ?? false) {
                $q->distinct();
            }
            if (isset($def['filtro'])) {
                ($def['filtro'])($q);
            }
            $union = $union ? $union->unionAll($q) : $q;
        }
        if (!$union) {
            return collect();
        }

        $porClave = $union->orderBy('k')->orderBy('v')->get()->groupBy('k');

        return collect(array_keys($listas))->mapWithKeys(fn ($clave) => [
            $clave => $porClave->get($clave, collect())->pluck('v')->values(),
        ]);
    }
}
