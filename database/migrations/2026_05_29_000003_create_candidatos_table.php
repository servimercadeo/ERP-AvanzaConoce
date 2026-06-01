<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidatos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requisicion_id')->nullable()->constrained('requisiciones')->nullOnDelete();
            $table->string('nombres', 200);
            $table->string('tipo_documento', 60)->default('Cédula de Ciudadanía');
            $table->string('identificacion', 30);
            $table->date('fecha_expedicion')->nullable();
            $table->unsignedSmallInteger('edad')->nullable();
            $table->string('ciudad', 120)->nullable();
            $table->string('correo', 180);
            $table->string('celular', 20)->nullable();
            $table->date('fecha_postulacion');
            $table->string('fuente', 80)->nullable();
            $table->string('fuente_especifica', 80)->nullable();
            $table->string('estado', 60)->default('Entrevista');
            $table->boolean('pruebas')->default(false);
            $table->boolean('aval')->default(false);
            $table->string('negocio', 150)->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidatos');
    }
};
