<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedido_automatico_items', function (Blueprint $table) {
            // Obligatoria cuando se marca "Aprobado por Stock": deja constancia de qué se
            // revisó (ej. "verificado en bodega el 30/08, hay 4 unidades disponibles").
            $table->text('observacion')->nullable()->after('estado_revision');
        });
    }

    public function down(): void
    {
        Schema::table('pedido_automatico_items', function (Blueprint $table) {
            $table->dropColumn('observacion');
        });
    }
};
