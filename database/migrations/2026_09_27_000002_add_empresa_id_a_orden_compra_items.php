<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Snapshot de la empresa "dueña" del producto (heredada del pedido de origen, ver
 * PedidoCompraController::resolverEmpresaId()) en cada línea de la Orden de Compra —
 * una orden puede consolidar productos de pedidos de empleados de distintas empresas,
 * así que la trazabilidad va por ítem, igual que la categoría.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orden_compra_items', function (Blueprint $table) {
            if (!Schema::hasColumn('orden_compra_items', 'empresa_id')) {
                $table->foreignId('empresa_id')->nullable()->after('categoria')
                    ->constrained('empresas')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('orden_compra_items', function (Blueprint $table) {
            if (Schema::hasColumn('orden_compra_items', 'empresa_id')) {
                $table->dropConstrainedForeignId('empresa_id');
            }
        });
    }
};
