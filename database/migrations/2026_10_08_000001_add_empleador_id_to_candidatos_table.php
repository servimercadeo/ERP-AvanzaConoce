<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Empleador del candidato: se elige al dar el aval de contratación (directo o
     * indirecto), ya no en la requisición.
     */
    public function up(): void
    {
        // Idempotente: en producción la columna puede haberse creado a mano.
        if (Schema::hasColumn('candidatos', 'empleador_id')) {
            return;
        }

        Schema::table('candidatos', function (Blueprint $table) {
            $table->unsignedBigInteger('empleador_id')->nullable()->after('tipo_vinculacion');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('candidatos', 'empleador_id')) {
            return;
        }

        Schema::table('candidatos', function (Blueprint $table) {
            $table->dropColumn('empleador_id');
        });
    }
};
