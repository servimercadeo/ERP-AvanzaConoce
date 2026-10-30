<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Contrato "Finalizado": por qué terminó (Terminación o Voluntario). */
    public function up(): void
    {
        if (!Schema::hasColumn('contratos', 'motivo_finalizacion')) {
            Schema::table('contratos', function (Blueprint $table) {
                $table->string('motivo_finalizacion', 20)->nullable()->after('estado_contrato');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('contratos', 'motivo_finalizacion')) {
            Schema::table('contratos', function (Blueprint $table) {
                $table->dropColumn('motivo_finalizacion');
            });
        }
    }
};
