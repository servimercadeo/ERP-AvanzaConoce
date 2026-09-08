<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos_automaticos', function (Blueprint $table) {
            // Que Dotación marque "Enviar a compras" solo hace que el pedido APAREZCA en
            // Pedidos. Que alguien en Pedidos lo reciba (marque este check) es una decisión
            // manual aparte: solo entonces se habilita la revisión de stock/traslado.
            $table->boolean('recibido_pedidos')->default(false)->after('estado');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_automaticos', function (Blueprint $table) {
            $table->dropColumn('recibido_pedidos');
        });
    }
};
