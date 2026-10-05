<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * El catálogo "cargos" (usado por "Cargo requerido" en Requisiciones y por varios
 * selects más) tenía 12 nombres duplicados exactos (24 filas -> 12 nombres reales),
 * probablemente de imports repetidos. Se conserva el id más antiguo de cada grupo y
 * se agrega un índice único para que no vuelva a pasar. Ninguna requisición
 * existente usaba los ids que se eliminan (verificado antes de escribir esto).
 */
return new class extends Migration
{
    public function up(): void
    {
        $grupos = DB::table('cargos')->select('id', 'nombre')->get()
            ->groupBy(fn ($c) => trim(mb_strtoupper($c->nombre, 'UTF-8')));

        foreach ($grupos as $grupo) {
            if ($grupo->count() < 2) {
                continue;
            }

            $idsAEliminar = $grupo->sortBy('id')->pluck('id')->slice(1)->values();
            DB::table('cargos')->whereIn('id', $idsAEliminar)->delete();
        }

        DB::statement('ALTER TABLE cargos ADD UNIQUE INDEX cargos_nombre_unique (nombre)');
    }

    public function down(): void
    {
        // Los duplicados eliminados no se pueden reconstruir; solo se retira el índice.
        DB::statement('ALTER TABLE cargos DROP INDEX cargos_nombre_unique');
    }
};
