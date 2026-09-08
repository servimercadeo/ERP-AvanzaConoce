<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventario_productos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tipo_producto_id')->constrained('tipos_producto')->cascadeOnDelete();
            $table->foreignId('sede_id')->constrained('sedes')->cascadeOnDelete();
            $table->unsignedInteger('precio')->default(0);
            $table->unsignedInteger('cantidad')->default(0);
            $table->unsignedInteger('stock_minimo')->default(0);
            $table->timestamps();

            $table->unique(['tipo_producto_id', 'sede_id'], 'inventario_productos_unico');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventario_productos');
    }
};
