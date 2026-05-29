<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('base_ingresos');

        Schema::create('base_ingresos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidato_id')->nullable()->constrained('candidatos')->nullOnDelete();
            $table->date('fecha_aval')->nullable();
            $table->string('documento_identificacion', 30);
            $table->string('nombre_completo', 200);
            $table->string('cargo', 150)->nullable();
            $table->string('ciudad', 120)->nullable();
            $table->string('empresa', 150)->nullable();
            $table->string('proyecto', 150)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('correo', 180)->nullable();
            $table->string('tipo_ingreso', 60)->nullable();
            $table->string('lugar_trabajo', 150)->nullable();
            $table->string('lider_inmediato', 150)->nullable();
            $table->string('empleador', 150)->nullable();
            $table->date('fecha_programacion_ingreso')->nullable();
            $table->date('fecha_correccion')->nullable();
            $table->string('tasa_riesgo_arl', 10)->nullable();
            $table->decimal('salario_basico', 12, 2)->nullable();
            $table->decimal('auxilio_transporte', 12, 2)->nullable()->default(0);
            $table->decimal('otrosi_variable', 12, 2)->nullable()->default(0);
            $table->decimal('auxilio_rodamiento', 12, 2)->nullable()->default(0);
            $table->decimal('auxilio_comunicacion', 12, 2)->nullable()->default(0);
            $table->decimal('auxilio_alimentacion', 12, 2)->nullable()->default(0);
            $table->string('estado', 40)->default('en proceso');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('base_ingresos');
    }
};
