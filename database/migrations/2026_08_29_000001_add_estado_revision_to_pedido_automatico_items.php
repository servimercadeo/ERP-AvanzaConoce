<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedido_automatico_items', function (Blueprint $table) {
            // Null = aún sin revisar. 'Stock Local' | 'Traslado Solicitado' | 'Enviado a Compras'
            // se fijan solo mediante una acción manual del revisor, nunca automáticamente.
            $table->string('estado_revision', 30)->nullable()->after('cantidad');
        });
    }

    public function down(): void
    {
        Schema::table('pedido_automatico_items', function (Blueprint $table) {
            $table->dropColumn('estado_revision');
        });
    }
};
