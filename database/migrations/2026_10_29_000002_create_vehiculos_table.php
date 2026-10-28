<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Parametros > Operaciones > Asignación de Vehículo: carros/motos de la empresa, con su
     * documentación (tarjeta de propiedad, SOAT, técnico-mecánica) y el técnico que lo tiene
     * asignado.
     */
    public function up(): void
    {
        Schema::create('vehiculos', function (Blueprint $table) {
            $table->id();
            $table->enum('tipo', ['Carro', 'Moto']);
            $table->string('placa', 20)->unique();
            $table->string('cc_propietario', 30)->nullable();
            // Tarjeta de propiedad: foto de las 2 caras.
            $table->string('tarjeta_propiedad_frontal')->nullable();
            $table->string('tarjeta_propiedad_trasera')->nullable();
            $table->date('fecha_matricula')->nullable();
            $table->date('fecha_vence_soat')->nullable();
            $table->date('fecha_vence_tecnomecanica')->nullable();
            $table->foreignId('tecnico_asignado_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehiculos');
    }
};
