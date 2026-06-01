<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('requisiciones', function (Blueprint $table) {
            $table->id();
            $table->string('nro_identificacion_proceso', 30)->unique();
            $table->string('nro_identificacion', 30)->nullable();
            $table->string('estado', 30)->default('Abierta');
            $table->string('cargo', 150)->nullable();
            $table->string('cargo_solicitante', 150)->nullable();
            $table->date('fecha_solicitud');
            $table->date('fecha_ingreso')->nullable();
            $table->date('fecha_cierre')->nullable();
            $table->unsignedSmallInteger('requeridas')->default(1);
            $table->unsignedSmallInteger('contratadas')->default(0);
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->string('tipo_solicitud', 60)->nullable();
            $table->string('responsable', 200)->nullable();
            $table->string('proceso', 80)->nullable();
            $table->string('ciudad', 120)->nullable();
            $table->string('pais', 80)->default('Colombia');
            $table->boolean('solicitud_confidencial')->default(false);
            $table->text('observaciones')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('requisiciones');
    }
};
