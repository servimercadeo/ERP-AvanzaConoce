<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Custodia de inventario: quién tiene actualmente una unidad (o una cantidad, si no
     * es serializado) de un producto fuera de la sede. Asignar DESCUENTA de
     * inventario_productos (y, si es un serial puntual, lo saca de
     * inventario_producto_series); devolver hace lo contrario. Mientras
     * `fecha_devolucion` sea NULL, la asignación está activa (la persona la tiene).
     */
    public function up(): void
    {
        Schema::create('asignaciones_inventario', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventario_producto_id')->constrained('inventario_productos')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('serial', 100)->nullable();
            $table->unsignedInteger('cantidad')->default(1);
            $table->date('fecha_asignacion');
            $table->date('fecha_devolucion')->nullable();
            $table->text('observacion')->nullable();
            $table->string('asignado_por', 150)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asignaciones_inventario');
    }
};
