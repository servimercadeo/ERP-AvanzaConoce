<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedido_compra_items', function (Blueprint $table) {
            $table->foreignId('tipo_producto_id')->nullable()->after('producto')->constrained('tipos_producto')->nullOnDelete();
            $table->string('estado_revision', 30)->nullable()->after('cantidad');
            $table->text('observacion')->nullable()->after('estado_revision');
        });

        // Backfill: los items ya creados guardan el producto como texto; se conecta
        // con el catálogo real de tipos de producto cuando el nombre coincide exacto.
        DB::statement('
            UPDATE pedido_compra_items pci
            JOIN tipos_producto tp ON UPPER(tp.nombre) = UPPER(pci.producto)
            SET pci.tipo_producto_id = tp.id
            WHERE pci.tipo_producto_id IS NULL
        ');
    }

    public function down(): void
    {
        Schema::table('pedido_compra_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tipo_producto_id');
            $table->dropColumn(['estado_revision', 'observacion']);
        });
    }
};
