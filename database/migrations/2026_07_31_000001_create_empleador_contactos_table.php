<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('empleador_contactos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('empleador_id');
            $table->string('nombre', 150);
            $table->string('correo', 150);
            // Región de cobertura del contacto (ej. "Bogotá y Cundinamarca", "Todo a nivel
            // nacional"): texto libre, no ligado al catálogo `regionales` — ese catálogo es
            // para asignación de pedidos/dotación y no cubre las mismas divisiones que usan
            // los empleadores para asignar contactos (Antioquia, Occidente, etc. no existen ahí).
            $table->string('regional', 100);
            $table->timestamps();

            $table->foreign('empleador_id')->references('id')->on('empleadores')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('empleador_contactos');
    }
};
