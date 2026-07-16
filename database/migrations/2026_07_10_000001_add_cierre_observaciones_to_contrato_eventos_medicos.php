<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contrato_eventos_medicos', function (Blueprint $table) {
            $table->date('fecha_cierre')->nullable()->after('estado');
            $table->json('observaciones')->nullable()->after('fecha_cierre');
        });
    }

    public function down(): void
    {
        Schema::table('contrato_eventos_medicos', function (Blueprint $table) {
            $table->dropColumn(['fecha_cierre', 'observaciones']);
        });
    }
};
