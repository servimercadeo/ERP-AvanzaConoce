<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sedes', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('nombre', 250);
            $table->unsignedBigInteger('id_ciudad')->nullable();
            $table->string('direccion', 250)->nullable();
            $table->string('telefono', 50)->nullable();
            $table->string('estado', 20)->default('Activa');
            $table->unsignedBigInteger('id_consultor_mac')->default(0);
            $table->unsignedBigInteger('id_almacenista_mac')->default(0);
            $table->unsignedBigInteger('id_secretaria_mac')->default(0);
            $table->unsignedBigInteger('id_jefe_mac')->default(0);
            $table->unsignedBigInteger('id_user_mac')->default(0);
            $table->unsignedBigInteger('id_torre_mac')->default(0);
            $table->string('codigo_distribuidor', 30)->nullable();
            $table->string('codigo_instalador', 30)->nullable();
            $table->string('numero_contrato_inicial', 30)->nullable();
            $table->string('numero_contrato_final', 30)->nullable();
            $table->integer('meta_prepago')->default(0);
            $table->integer('meta_postpago')->default(0);
            $table->string('tipo_sede', 20)->default('Principal');
            $table->unsignedBigInteger('id_sede_padre')->default(0);
            $table->string('sub_canal', 50)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sedes');
    }
};
