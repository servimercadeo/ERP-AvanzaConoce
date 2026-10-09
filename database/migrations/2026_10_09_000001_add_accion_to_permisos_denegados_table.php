<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const COLUMNAS_UNICO = ['rol', 'modulo_id', 'submodulo_id', 'archivo_id', 'accion'];

    /**
     * Permisos por acción (crear, editar, eliminar, importar, exportar) dentro de una
     * pestaña. `accion` vacía ('') es la denegación de ver la pestaña/submódulo, que es lo
     * que ya existía: las filas actuales quedan igual y nadie gana ni pierde nada al migrar.
     * Con valor, el rol sigue viendo la pestaña pero no puede hacer esa acción en ella.
     *
     * Idempotente (producción puede tener la columna o el índice ya creados a mano): cada
     * paso revisa si ya está hecho.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('permisos_denegados', 'accion')) {
            Schema::table('permisos_denegados', function (Blueprint $table) {
                $table->string('accion', 20)->default('')->after('archivo_id');
            });
        }

        if ($this->unicoIncluyeAccion()) {
            return;
        }

        Schema::table('permisos_denegados', function (Blueprint $table) {
            if (Schema::hasIndex('permisos_denegados', 'permisos_denegados_unico')) {
                $table->dropUnique('permisos_denegados_unico');
            }
            $table->unique(self::COLUMNAS_UNICO, 'permisos_denegados_unico');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('permisos_denegados', 'accion')) {
            return;
        }

        \Illuminate\Support\Facades\DB::table('permisos_denegados')->where('accion', '!=', '')->delete();

        Schema::table('permisos_denegados', function (Blueprint $table) {
            $table->dropUnique('permisos_denegados_unico');
            $table->unique(['rol', 'modulo_id', 'submodulo_id', 'archivo_id'], 'permisos_denegados_unico');
        });

        Schema::table('permisos_denegados', function (Blueprint $table) {
            $table->dropColumn('accion');
        });
    }

    private function unicoIncluyeAccion(): bool
    {
        foreach (Schema::getIndexes('permisos_denegados') as $indice) {
            if ($indice['name'] === 'permisos_denegados_unico') {
                return $indice['columns'] === self::COLUMNAS_UNICO;
            }
        }
        return false;
    }
};
