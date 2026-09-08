<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('traslados_dotacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_automatico_id')->constrained('pedidos_automaticos')->cascadeOnDelete();
            $table->foreignId('pedido_automatico_item_id')->nullable()->constrained('pedido_automatico_items')->nullOnDelete();
            $table->foreignId('inventario_dotacion_origen_id')->nullable()->constrained('inventario_dotacion')->nullOnDelete();
            $table->foreignId('sede_destino_id')->nullable()->constrained('sedes')->nullOnDelete();
            // Snapshot de la prenda al momento del traslado: sigue siendo legible aunque
            // se borre el item o la fila de inventario de origen más adelante.
            $table->string('prenda', 150);
            $table->string('genero', 20);
            $table->string('talla', 10);
            $table->unsignedInteger('cantidad');
            $table->string('estado', 30)->default('Completado');
            $table->string('solicitado_por', 150)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('traslados_dotacion');
    }
};
