<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orden_compra_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('orden_compra_id')->constrained('ordenes_compra')->cascadeOnDelete();
            $table->foreignId('pedido_compra_item_id')->nullable()->constrained('pedido_compra_items')->nullOnDelete();
            $table->foreignId('tipo_producto_id')->nullable()->constrained('tipos_producto')->nullOnDelete();
            $table->string('producto', 150);
            $table->string('categoria', 100)->nullable();
            $table->unsignedInteger('cantidad');
            $table->unsignedBigInteger('precio_unitario')->default(0);
            $table->unsignedInteger('iva_porcentaje')->default(19);
            $table->unsignedBigInteger('subtotal')->default(0);
            $table->unsignedBigInteger('iva_valor')->default(0);
            $table->unsignedBigInteger('total')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orden_compra_items');
    }
};
