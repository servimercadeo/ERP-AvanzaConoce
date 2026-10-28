<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Proyectos para los que trabaja el aliado (uno o varios), enlazados al catálogo de
     * Parámetros > Proyectos por id: si un proyecto se renombra allá, el aliado lo muestra
     * con el nombre nuevo. El tipo de documento ya existía: ahora admite también CE.
     */
    public function up(): void
    {
        if (!Schema::hasTable('aliado_proyecto')) {
            Schema::create('aliado_proyecto', function (Blueprint $table) {
                $table->id();
                $table->foreignId('aliado_id')->constrained('aliados')->cascadeOnDelete();
                $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
                $table->timestamps();

                $table->unique(['aliado_id', 'proyecto_id']);
            });
        }

        // Una primera versión (solo en local) guardaba los nombres en una columna JSON.
        if (Schema::hasColumn('aliados', 'proyectos')) {
            Schema::table('aliados', function (Blueprint $table) {
                $table->dropColumn('proyectos');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('aliado_proyecto');
    }
};
