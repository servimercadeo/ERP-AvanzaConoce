<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Las sedes con "Código C.I" ya dicen de qué proveedor son: se asocian sin volverlas a digitar.
    public function up(): void
    {
        $sedes = DB::table('sedes')->whereNotNull('codigo_instalador')->orderBy('id')->get(['id', 'codigo_instalador']);

        foreach ($sedes as $sede) {
            $codigo = mb_strtoupper(trim($sede->codigo_instalador), 'UTF-8');
            if (!preg_match('/^CO-I\d+$/', $codigo)) {
                continue;
            }

            $nombre = DB::table('work_orders')->where('proveedor', 'like', "{$codigo}-%")->value('proveedor')
                ?? DB::table('valores_parametro')->where('nombre', 'like', "{$codigo}-%")->value('nombre')
                ?? $codigo;

            // insertOrIgnore: si dos sedes tienen el mismo código, no debe trabar `migrate`.
            DB::table('proveedores_work_orders')->insertOrIgnore([
                'sede_id' => $sede->id, 'codigo' => $codigo, 'nombre' => $nombre,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('proveedores_work_orders')->delete();
    }
};
