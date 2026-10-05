<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * El nuevo submódulo "Auditoría" (Permisos > Auditoría) debe quedar reservado a admin
     * desde el primer momento, igual que se hizo con el módulo Permisos completo en
     * 2026_09_10_000003 (admin nunca necesita fila, siempre tiene acceso total).
     */
    public function up(): void
    {
        $now = now();
        $rows = [];
        foreach (['th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general'] as $rol) {
            $rows[] = [
                'rol' => $rol,
                'modulo_id' => 'permisos',
                'submodulo_id' => 'auditoria',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        DB::table('permisos_denegados')->insert($rows);
    }

    public function down(): void
    {
        DB::table('permisos_denegados')->where('modulo_id', 'permisos')->where('submodulo_id', 'auditoria')->delete();
    }
};
