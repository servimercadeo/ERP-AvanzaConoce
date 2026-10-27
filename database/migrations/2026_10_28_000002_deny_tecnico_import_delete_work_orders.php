<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * El técnico entra a Work Orders a ver las suyas, pero por defecto (sin negaciones)
     * también podía importar archivos y eliminar WOs de cualquier técnico. Se le niegan esas
     * dos acciones; desde la matriz de Permisos se pueden volver a dar si algún día aplica.
     */
    private const ACCIONES = ['eliminar', 'importar'];

    public function up(): void
    {
        $now = now();
        foreach (self::ACCIONES as $accion) {
            $fila = ['rol' => 'tecnico', 'modulo_id' => 'inventarios', 'submodulo_id' => 'work_orders', 'archivo_id' => '', 'accion' => $accion];
            if (!DB::table('permisos_denegados')->where($fila)->exists()) {
                DB::table('permisos_denegados')->insert($fila + ['created_at' => $now, 'updated_at' => $now]);
            }
        }
    }

    public function down(): void
    {
        DB::table('permisos_denegados')
            ->where(['rol' => 'tecnico', 'modulo_id' => 'inventarios', 'submodulo_id' => 'work_orders', 'archivo_id' => ''])
            ->whereIn('accion', self::ACCIONES)
            ->delete();
    }
};
