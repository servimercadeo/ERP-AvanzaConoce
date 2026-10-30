<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Parámetros > Cargos es nuevo: cada rol arranca con las mismas restricciones que ya
     * tiene en Parámetros > Proyectos (si no ve Proyectos o no puede eliminar ahí, tampoco en
     * Cargos). Después se ajusta en la matriz de Permisos. Idempotente.
     */
    public function up(): void
    {
        $now = now();
        $filas = DB::table('permisos_denegados')
            ->where('modulo_id', 'parametros')->where('submodulo_id', 'proyectos')
            ->get(['rol', 'archivo_id', 'accion']);

        foreach ($filas as $f) {
            $fila = [
                'rol'          => $f->rol,
                'modulo_id'    => 'parametros',
                'submodulo_id' => 'cargos',
                'archivo_id'   => $f->archivo_id === 'proyectos_file' ? 'cargos_file' : $f->archivo_id,
                'accion'       => $f->accion,
            ];
            if (!DB::table('permisos_denegados')->where($fila)->exists()) {
                DB::table('permisos_denegados')->insert($fila + ['created_at' => $now, 'updated_at' => $now]);
            }
        }
    }

    public function down(): void
    {
        DB::table('permisos_denegados')->where('modulo_id', 'parametros')->where('submodulo_id', 'cargos')->delete();
    }
};
