<?php

use App\Models\PermisoDenegado;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * El reporte de Auxilios muestra, de TODOS los técnicos directos, cuántas WO finalizó
     * cada uno y cuánto le corresponde de pago — por defecto (sin negaciones) un técnico
     * también entraría a ver el auxilio de sus compañeros y a editar las escalas de pago.
     * Se le niega por completo el submódulo (igual que Work Orders le niega importar/
     * eliminar en 2026_10_28_000002, pero aquí es la pestaña entera: ni siquiera debe verla).
     */
    public function up(): void
    {
        $fila = [
            'rol' => 'tecnico', 'modulo_id' => 'operaciones', 'submodulo_id' => 'auxilios',
            'archivo_id' => PermisoDenegado::TODO_EL_SUBMODULO, 'accion' => PermisoDenegado::VER,
        ];
        if (!DB::table('permisos_denegados')->where($fila)->exists()) {
            DB::table('permisos_denegados')->insert($fila + ['created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        DB::table('permisos_denegados')->where([
            'rol' => 'tecnico', 'modulo_id' => 'operaciones', 'submodulo_id' => 'auxilios',
            'archivo_id' => PermisoDenegado::TODO_EL_SUBMODULO, 'accion' => PermisoDenegado::VER,
        ])->delete();
    }
};
