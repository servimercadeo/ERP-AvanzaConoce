<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sede de la que sale el pedido de dotación: obligatoria al crearlo a mano, y sus prendas se
     * descuentan del inventario de esa sede. Los pedidos que ya existen toman la sede de su
     * primera prenda.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('pedidos_automaticos', 'sede_id')) {
            Schema::table('pedidos_automaticos', function (Blueprint $table) {
                $table->foreignId('sede_id')->nullable()->after('empleado_id')->constrained('sedes')->nullOnDelete();
            });
        }

        $pedidos = DB::getQueryGrammar()->wrapTable('pedidos_automaticos');
        $items = DB::getQueryGrammar()->wrapTable('pedido_automatico_items');
        $inventario = DB::getQueryGrammar()->wrapTable('inventario_dotacion');
        DB::statement("
            UPDATE {$pedidos} p
            SET p.sede_id = (
                SELECT i.sede_id FROM {$items} it
                JOIN {$inventario} i ON i.id = it.inventario_dotacion_id
                WHERE it.pedido_automatico_id = p.id
                ORDER BY it.id LIMIT 1
            )
            WHERE p.sede_id IS NULL
        ");
    }

    public function down(): void
    {
        if (!Schema::hasColumn('pedidos_automaticos', 'sede_id')) {
            return;
        }

        Schema::table('pedidos_automaticos', function (Blueprint $table) {
            $table->dropForeign(['sede_id']);
            $table->dropColumn('sede_id');
        });
    }
};
