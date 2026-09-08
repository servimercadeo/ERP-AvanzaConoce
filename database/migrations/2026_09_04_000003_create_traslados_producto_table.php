<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('traslados_producto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_compra_id')->constrained('pedidos_compra')->cascadeOnDelete();
            $table->foreignId('pedido_compra_item_id')->nullable()->constrained('pedido_compra_items')->nullOnDelete();
            $table->foreignId('inventario_producto_origen_id')->nullable()->constrained('inventario_productos')->nullOnDelete();
            $table->foreignId('sede_destino_id')->nullable()->constrained('sedes')->nullOnDelete();
            $table->string('producto', 150);
            $table->unsignedInteger('cantidad');
            $table->string('estado', 30)->default('Completado');
            $table->string('solicitado_por', 150)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('traslados_producto');
    }
};
