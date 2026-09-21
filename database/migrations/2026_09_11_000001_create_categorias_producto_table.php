<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Catálogo de categorías de producto (Parametros > Categoría del Producto). Antes
     * vivían fijas en TipoProducto::CATEGORIAS; ahora son administrables, y crear una
     * categoría nueva aquí genera automáticamente su propio submódulo de inventario por
     * sede (ver resources/js/hooks/useErpModules.js), igual que Activos/Materiales/etc.
     */
    public function up(): void
    {
        Schema::create('categorias_producto', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100)->unique();
            $table->timestamps();
        });

        $now = now();
        // Las 6 categorías que ya existían fijas en el código (TipoProducto::CATEGORIAS):
        // Activos/Materiales/Equipos/EPP/Herramientas ya tienen su módulo de inventario
        // propio hecho a mano, y Dotación tiene su propio sistema aparte (inventario_dotacion).
        // Ninguna de las 6 dispara la generación automática de un submódulo nuevo.
        foreach (['Activos', 'Materiales', 'Equipos', 'Dotación', 'EPP', 'Herramientas'] as $nombre) {
            DB::table('categorias_producto')->insert([
                'nombre' => $nombre,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('categorias_producto');
    }
};
