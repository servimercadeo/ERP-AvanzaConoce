<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Marca cuándo un producto "Enviado a Compras" ya quedó incluido en una Orden de
 * Compra, para que deje de contarse como pendiente en el panel de "Tipo de Elementos
 * Pendientes en Pedidos" (ver OrdenCompraController::pendientesPorCategoria()).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedido_compra_items', function (Blueprint $table) {
            if (!Schema::hasColumn('pedido_compra_items', 'orden_compra_id')) {
                $table->foreignId('orden_compra_id')->nullable()->after('seriales')
                    ->constrained('ordenes_compra')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('pedido_compra_items', function (Blueprint $table) {
            if (Schema::hasColumn('pedido_compra_items', 'orden_compra_id')) {
                $table->dropConstrainedForeignId('orden_compra_id');
            }
        });
    }
};
