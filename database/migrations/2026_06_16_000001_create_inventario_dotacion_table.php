<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventario_dotacion', function (Blueprint $table) {
            $table->id();
            $table->string('categoria', 60);
            $table->string('subcategoria', 80);
            $table->string('genero', 20);
            $table->string('talla', 10);
            $table->unsignedInteger('cantidad')->default(0);
            $table->unsignedInteger('stock_minimo')->default(0);
            $table->timestamps();

            $table->unique(['categoria', 'subcategoria', 'genero', 'talla'], 'inventario_dotacion_unico');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventario_dotacion');
    }
};
