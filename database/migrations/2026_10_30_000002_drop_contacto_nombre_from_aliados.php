<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** "Persona de contacto" del aliado: nadie la pidió (no está en lo que definió Operaciones). */
    public function up(): void
    {
        if (Schema::hasColumn('aliados', 'contacto_nombre')) {
            Schema::table('aliados', function (Blueprint $table) {
                $table->dropColumn('contacto_nombre');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('aliados', 'contacto_nombre')) {
            Schema::table('aliados', function (Blueprint $table) {
                $table->string('contacto_nombre', 150)->nullable()->after('modalidad_id_bt');
            });
        }
    }
};
