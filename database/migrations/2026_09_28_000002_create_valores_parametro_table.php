<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Valores dentro de un Tipo de Parámetro genérico (ver tipos_parametro). Cada fila es
     * un elemento simple (ej. si el tipo es "Turnos", un valor podría ser "Diurno").
     */
    public function up(): void
    {
        Schema::create('valores_parametro', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tipo_parametro_id')->constrained('tipos_parametro')->cascadeOnDelete();
            $table->string('nombre', 150);
            $table->string('descripcion', 255)->nullable();
            $table->timestamps();

            $table->unique(['tipo_parametro_id', 'nombre']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('valores_parametro');
    }
};
