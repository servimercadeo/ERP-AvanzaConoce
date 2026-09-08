<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedidos_compra', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->date('fecha_registro');
            $table->enum('tipo_responsable', ['Empleado', 'Subagente']);
            $table->string('responsable', 150);
            $table->string('sede', 150);
            $table->string('clase', 150);
            $table->string('concepto', 150);
            $table->string('estado', 50)->default('Pendiente Aprobación');
            $table->string('registra', 150)->nullable();
            $table->timestamps();
        });

        Schema::create('pedido_compra_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_compra_id')->constrained('pedidos_compra')->cascadeOnDelete();
            $table->string('producto', 150);
            $table->unsignedInteger('cantidad');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedido_compra_items');
        Schema::dropIfExists('pedidos_compra');
    }
};
