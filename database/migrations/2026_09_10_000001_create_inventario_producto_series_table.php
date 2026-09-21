<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Seriales individuales de un item de inventario (Inventarios > Activos/Materiales/
     * Equipos/EPP/Herramientas/General). "Serializado" es una decisión ad-hoc por cada
     * carga de stock (no una propiedad fija del tipo de producto): cuando se marca el
     * check al agregar/editar un item, se pide un serial por unidad y cada uno queda
     * como una fila aquí, ligada al item (tipo_producto + sede) al que pertenece.
     */
    public function up(): void
    {
        Schema::create('inventario_producto_series', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventario_producto_id')->constrained('inventario_productos')->cascadeOnDelete();
            $table->string('serial', 100);
            $table->unique('serial');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventario_producto_series');
    }
};
