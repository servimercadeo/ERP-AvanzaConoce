<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Parte de `cantidad` que no había en inventario al crear el pedido y hay que comprar: solo
     * se descuenta del stock `cantidad - cantidad_por_comprar`.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('pedido_automatico_items', 'cantidad_por_comprar')) {
            Schema::table('pedido_automatico_items', function (Blueprint $table) {
                $table->unsignedInteger('cantidad_por_comprar')->default(0)->after('cantidad');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('pedido_automatico_items', 'cantidad_por_comprar')) {
            Schema::table('pedido_automatico_items', function (Blueprint $table) {
                $table->dropColumn('cantidad_por_comprar');
            });
        }
    }
};
