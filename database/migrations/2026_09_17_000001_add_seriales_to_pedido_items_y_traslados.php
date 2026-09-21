<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Guarda qué seriales puntuales se usaron para resolver un producto de pedido (por
 * stock local o por traslado), cuando el producto es serializado — así queda trazado
 * en la revisión y se puede mostrar en el Acta de Entrega / Acta de Traslado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedido_compra_items', function (Blueprint $table) {
            if (!Schema::hasColumn('pedido_compra_items', 'seriales')) {
                $table->text('seriales')->nullable()->after('observacion');
            }
        });

        Schema::table('traslados_producto', function (Blueprint $table) {
            if (!Schema::hasColumn('traslados_producto', 'seriales')) {
                $table->text('seriales')->nullable()->after('cantidad');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pedido_compra_items', function (Blueprint $table) {
            if (Schema::hasColumn('pedido_compra_items', 'seriales')) {
                $table->dropColumn('seriales');
            }
        });

        Schema::table('traslados_producto', function (Blueprint $table) {
            if (Schema::hasColumn('traslados_producto', 'seriales')) {
                $table->dropColumn('seriales');
            }
        });
    }
};
