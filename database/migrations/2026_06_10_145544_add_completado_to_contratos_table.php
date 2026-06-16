<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('contratos', function (Blueprint $table) {
            $table->boolean('completado')->default(true)->after('estado_contrato');
        });

        // Contratos ya existentes con estado anulado quedan como no completado
        DB::table('contratos')
            ->where('estado_contrato', 'Contrato anulado')
            ->update(['completado' => false]);
    }

    public function down(): void
    {
        Schema::table('contratos', function (Blueprint $table) {
            $table->dropColumn('completado');
        });
    }
};
