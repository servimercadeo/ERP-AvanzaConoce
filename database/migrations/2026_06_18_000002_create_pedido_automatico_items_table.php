<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedido_automatico_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_automatico_id')->constrained('pedidos_automaticos')->cascadeOnDelete();
            $table->foreignId('inventario_dotacion_id')->constrained('inventario_dotacion');
            $table->unsignedSmallInteger('cantidad');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedido_automatico_items');
    }
};
