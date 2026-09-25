<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Catálogo genérico de "Tipos de Parámetro" (Parametros > Ver y Crear Parametros).
     * Igual que Categoría del Producto: no tiene campos propios de negocio, solo agrupa
     * valores simples (nombre/descripción, ver valores_parametro) bajo un nombre que el
     * usuario define libremente, sin tocar los catálogos ya construidos a mano
     * (Empleadores, Empresas, Proveedores, etc.).
     */
    public function up(): void
    {
        Schema::create('tipos_parametro', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100)->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tipos_parametro');
    }
};
