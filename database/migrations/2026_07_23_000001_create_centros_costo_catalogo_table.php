<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('centros_costo_catalogo', function (Blueprint $table) {
            $table->id();
            $table->string('empresa', 150);
            $table->string('codigo', 30);
            $table->string('nombre', 200);
            $table->string('ciudad', 100)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->unique(['empresa', 'codigo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('centros_costo_catalogo');
    }
};
