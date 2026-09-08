<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos_compra', function (Blueprint $table) {
            // Estado del seguimiento en el equipo de Compras, solo aplica una vez que
            // el pedido pasó a "Enviado a compras" (Cotizando, Pendiente Aprobación...).
            $table->string('estado_compra', 50)->nullable()->after('estado');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_compra', function (Blueprint $table) {
            $table->dropColumn('estado_compra');
        });
    }
};
