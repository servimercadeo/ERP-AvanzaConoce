<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos_automaticos', function (Blueprint $table) {
            // Mismo campo/uso que pedidos_compra.estado_compra (Cotizando, Pendiente
            // Aprobación): se activa solo cuando el pedido ya está confirmado ("check"
            // recibido_pedidos = true) para el equipo de Compras.
            $table->string('estado_compra', 50)->nullable()->after('recibido_pedidos');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_automaticos', function (Blueprint $table) {
            $table->dropColumn('estado_compra');
        });
    }
};
