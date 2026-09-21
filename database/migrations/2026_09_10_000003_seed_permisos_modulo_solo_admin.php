<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * El nuevo módulo "Permisos" (administra qué rol ve qué) debe quedar reservado a
     * admin desde el primer momento: se le niega explícitamente a los otros 4 roles
     * gestionables (admin nunca necesita fila, siempre tiene acceso total).
     */
    public function up(): void
    {
        $now = now();
        $rows = [];
        foreach (\App\Models\PermisoDenegado::ROLES_GESTIONABLES as $rol) {
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
