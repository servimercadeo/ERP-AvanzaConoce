<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Trazabilidad de propiedad: qué empresa (SERVIMERCADEO, SYM, etc.) es dueña de cada
 * unidad de inventario, y de qué empresa es el empleado para quien se creó un pedido —
 * esto último se resuelve solo al crear el pedido (ver PedidoCompraController::store())
 * y de ahí en adelante viaja como snapshot (no se vuelve a resolver en vivo) hacia la
 * Orden de Compra y el Acta de Entrega, para que la trazabilidad no cambie si el
 * empleado cambia de empresa después.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventario_productos', function (Blueprint $table) {
            if (!Schema::hasColumn('inventario_productos', 'empresa_id')) {
                $table->foreignId('empresa_id')->nullable()->after('talla')
                    ->constrained('empresas')->nullOnDelete();
            }
        });

        // El "mismo item" ahora también depende de a qué empresa pertenece: 5 unidades de
        // Servimercadeo y 3 de SYM del mismo producto/sede/talla son filas separadas.
        Schema::table('inventario_productos', function (Blueprint $table) {
            $table->dropUnique('inventario_productos_unico');
        });
        Schema::table('inventario_productos', function (Blueprint $table) {
            $table->unique(['tipo_producto_id', 'sede_id', 'talla', 'empresa_id'], 'inventario_productos_unico');
        });

        Schema::table('pedidos_compra', function (Blueprint $table) {
            if (!Schema::hasColumn('pedidos_compra', 'empresa_id')) {
                $table->foreignId('empresa_id')->nullable()->after('responsable')
                    ->constrained('empresas')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_compra', function (Blueprint $table) {
            if (Schema::hasColumn('pedidos_compra', 'empresa_id')) {
                $table->dropConstrainedForeignId('empresa_id');
            }
        });

        Schema::table('inventario_productos', function (Blueprint $table) {
            $table->dropUnique('inventario_productos_unico');
        });
        Schema::table('inventario_productos', function (Blueprint $table) {
            $table->unique(['tipo_producto_id', 'sede_id', 'talla'], 'inventario_productos_unico');
        });
        Schema::table('inventario_productos', function (Blueprint $table) {
            if (Schema::hasColumn('inventario_productos', 'empresa_id')) {
                $table->dropConstrainedForeignId('empresa_id');
            }
        });
    }
};
