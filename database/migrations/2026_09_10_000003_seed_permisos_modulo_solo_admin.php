<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * El nuevo módulo "Permisos" (administra qué rol ve qué) debe quedar reservado a
     * admin desde el primer momento: se le niega explícitamente a los otros 4 roles
     * gestionables de ESTA fecha (admin nunca necesita fila, siempre tiene acceso
     * total). Lista fija a propósito, NO PermisoDenegado::ROLES_GESTIONABLES: esa
     * constante cambia con el código actual, pero en un migrate:fresh esta migración
     * corre contra el esquema tal como era el 2026-09-10 (roles_permisos.rol todavía
     * sin los roles nuevos agregados después) — referenciar la constante viva rompe el
     * reemplazo desde cero. La migración 2026_09_24_000001 se encarga de traer esto al
     * día para los roles agregados más tarde.
     */
    public function up(): void
    {
        $now = now();
        $rows = [];
        foreach (['gestor', 'consultor', 'th', 'tic'] as $rol) {
            $rows[] = [
                'rol' => $rol,
                'modulo_id' => 'permisos',
                'submodulo_id' => 'roles_permisos',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        DB::table('permisos_denegados')->insert($rows);
    }

    public function down(): void
    {
        DB::table('permisos_denegados')->where('modulo_id', 'permisos')->delete();
    }
};
