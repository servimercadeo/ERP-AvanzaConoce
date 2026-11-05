<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * La Orden de Compra también compra prendas de dotación. La línea de la orden guarda el pedido
 * y la fila de inventario, no la línea del pedido: esa se recrea cada vez que se edita el
 * pedido (PedidoAutomatico::cambiarEstado), y el vínculo se perdería.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orden_compra_items', function (Blueprint $table) {
            if (!Schema::hasColumn('orden_compra_items', 'pedido_automatico_id')) {
                $table->foreignId('pedido_automatico_id')->nullable()->after('pedido_compra_item_id')
                    ->constrained('pedidos_automaticos')->nullOnDelete();
            }
            if (!Schema::hasColumn('orden_compra_items', 'inventario_dotacion_id')) {
                $table->foreignId('inventario_dotacion_id')->nullable()->after('pedido_automatico_id')
                    ->constrained('inventario_dotacion')->nullOnDelete();
            }
        });

        Schema::table('pedido_automatico_items', function (Blueprint $table) {
            if (!Schema::hasColumn('pedido_automatico_items', 'orden_compra_id')) {
                $table->foreignId('orden_compra_id')->nullable()->after('cantidad_por_comprar')
                    ->constrained('ordenes_compra')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('pedido_automatico_items', function (Blueprint $table) {
            if (Schema::hasColumn('pedido_automatico_items', 'orden_compra_id')) {
                $table->dropConstrainedForeignId('orden_compra_id');
            }
        });

        Schema::table('orden_compra_items', function (Blueprint $table) {
            if (Schema::hasColumn('orden_compra_items', 'inventario_dotacion_id')) {
                $table->dropConstrainedForeignId('inventario_dotacion_id');
            }
            if (Schema::hasColumn('orden_compra_items', 'pedido_automatico_id')) {
                $table->dropConstrainedForeignId('pedido_automatico_id');
            }
        });
    }
};
