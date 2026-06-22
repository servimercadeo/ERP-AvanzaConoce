<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos_automaticos', function (Blueprint $table) {
            $table->foreignId('pedido_global_id')
                  ->nullable()
                  ->after('contrato_id')
                  ->constrained('pedidos_globales')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_automaticos', function (Blueprint $table) {
            $table->dropForeign(['pedido_global_id']);
            $table->dropColumn('pedido_global_id');
        });
    }
};
