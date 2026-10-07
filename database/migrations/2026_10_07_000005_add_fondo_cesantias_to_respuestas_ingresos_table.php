<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Idempotente: en producción la columna puede haberse creado a mano.
        if (Schema::hasColumn('respuestas_ingresos', 'fondo_cesantias')) {
            return;
        }

        Schema::table('respuestas_ingresos', function (Blueprint $table) {
            $table->string('fondo_cesantias', 150)->nullable()->after('afp');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('respuestas_ingresos', 'fondo_cesantias')) {
            return;
        }

        Schema::table('respuestas_ingresos', function (Blueprint $table) {
            $table->dropColumn('fondo_cesantias');
        });
    }
};
