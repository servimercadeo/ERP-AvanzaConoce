<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Permisos por pestaña (archivo) dentro de un submódulo. `archivo_id` vacío ('') es la
     * denegación de todo el submódulo, que es lo que ya existía: las filas actuales quedan
     * igual y nadie gana ni pierde acceso al migrar. Se usa '' y no NULL para que el índice
     * único siga evitando filas repetidas (MySQL no compara NULLs en un índice único).
     */
    public function up(): void
    {
        if (Schema::hasColumn('permisos_denegados', 'archivo_id')) {
            return;
        }

        Schema::table('permisos_denegados', function (Blueprint $table) {
            $table->string('archivo_id', 80)->default('')->after('submodulo_id');
        });

        Schema::table('permisos_denegados', function (Blueprint $table) {
            $table->dropUnique('permisos_denegados_unico');
            $table->unique(['rol', 'modulo_id', 'submodulo_id', 'archivo_id'], 'permisos_denegados_unico');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('permisos_denegados', 'archivo_id')) {
            return;
        }

        \Illuminate\Support\Facades\DB::table('permisos_denegados')->where('archivo_id', '!=', '')->delete();

        Schema::table('permisos_denegados', function (Blueprint $table) {
            $table->dropUnique('permisos_denegados_unico');
            $table->unique(['rol', 'modulo_id', 'submodulo_id'], 'permisos_denegados_unico');
        });

        Schema::table('permisos_denegados', function (Blueprint $table) {
            $table->dropColumn('archivo_id');
        });
    }
};
