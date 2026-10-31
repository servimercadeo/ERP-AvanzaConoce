<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Parámetros > "Operaciones" (Tipo de Servicio, Tipo de Cliente, Proveedor / Código
     * Instalador, Perímetro de la Zona, Tecnología y Asignación de Vehículo) pasa a llamarse
     * "Operativos", como los otros grupos (Generales, Administrativos...). Así tampoco se
     * confunde con el módulo Operaciones. El id del submódulo sale del nombre del grupo
     * (paramgrupo_operaciones => paramgrupo_operativos): las restricciones que se hayan
     * guardado en la matriz de Permisos se pasan al id nuevo.
     */
    public function up(): void
    {
        DB::table('tipos_parametro')->where('grupo', 'Operaciones')->update(['grupo' => 'Operativos', 'updated_at' => now()]);
        DB::table('permisos_denegados')->where('modulo_id', 'parametros')->where('submodulo_id', 'paramgrupo_operaciones')
            ->update(['submodulo_id' => 'paramgrupo_operativos', 'updated_at' => now()]);
    }

    public function down(): void
    {
        DB::table('tipos_parametro')->where('grupo', 'Operativos')->update(['grupo' => 'Operaciones', 'updated_at' => now()]);
        DB::table('permisos_denegados')->where('modulo_id', 'parametros')->where('submodulo_id', 'paramgrupo_operativos')
            ->update(['submodulo_id' => 'paramgrupo_operaciones', 'updated_at' => now()]);
    }
};
