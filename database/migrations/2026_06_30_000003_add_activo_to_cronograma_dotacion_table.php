<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cronograma_dotacion', function (Blueprint $table) {
            $table->boolean('activo')->default(true)->after('ciclo_meses');
        });

        // Activar filas existentes que hayan quedado con activo = 0 por el ALTER TABLE
        \Illuminate\Support\Facades\DB::statement(
            'UPDATE cronograma_dotacion SET activo = 1 WHERE activo = 0 OR activo IS NULL'
        );
    }

    public function down(): void
    {
        Schema::table('cronograma_dotacion', function (Blueprint $table) {
            $table->dropColumn('activo');
        });
    }
};
