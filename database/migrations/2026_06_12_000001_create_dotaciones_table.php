<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dotaciones', function (Blueprint $table) {
            $table->id();
            $table->string('sede', 180)->nullable();
            $table->string('cedula', 30)->nullable()->index();
            $table->string('nombres', 150)->nullable();
            $table->string('apellidos', 150)->nullable();
            $table->string('cargo', 150)->nullable();
            $table->string('tipo_contrato', 80)->nullable();
            $table->string('proceso', 80)->nullable();
            $table->date('fecha_ingreso')->nullable();
            $table->string('estado_contrato', 80)->nullable()->index();
            $table->string('empleador', 150)->nullable();
            $table->string('proyecto', 120)->nullable();
            $table->string('genero', 30)->nullable();
            $table->string('ciudad', 120)->nullable();

            $table->string('polo_masculino_talla', 20)->nullable();
            $table->unsignedSmallInteger('polo_masculino_cantidad')->nullable();
            $table->string('polo_femenino_talla', 20)->nullable();
            $table->unsignedSmallInteger('polo_femenino_cantidad')->nullable();
            $table->string('jean_masculino_talla', 20)->nullable();
            $table->unsignedSmallInteger('jean_masculino_cantidad')->nullable();
            $table->string('jean_femenino_talla', 20)->nullable();
            $table->unsignedSmallInteger('jean_femenino_cantidad')->nullable();
            $table->string('chaqueta_masculino_talla', 20)->nullable();
            $table->unsignedSmallInteger('chaqueta_masculino_cantidad')->nullable();
            $table->string('chaqueta_femenino_talla', 20)->nullable();
            $table->unsignedSmallInteger('chaqueta_femenino_cantidad')->nullable();
            $table->string('tenis_masculino_talla', 20)->nullable();
            $table->unsignedSmallInteger('tenis_masculino_cantidad')->nullable();
            $table->string('tenis_femenino_talla', 20)->nullable();
            $table->unsignedSmallInteger('tenis_femenino_cantidad')->nullable();

            $table->string('estado_acta', 40)->nullable()->index();
            $table->string('actas_sept', 40)->nullable();
            $table->date('fecha_segunda_renovacion_2025')->nullable();
            $table->date('fecha_primera_renovacion_2024')->nullable();
            $table->date('fecha_segunda_renovacion_2024')->nullable();
            $table->date('fecha_tercera_renovacion_2024')->nullable();
            $table->date('fecha_primera_renovacion_2025')->nullable();
            $table->string('pedido_inicial', 50)->nullable();
            $table->date('fecha_inicial')->nullable();
            $table->string('pedido_renovacion_1', 50)->nullable();
            $table->string('fecha_renovacion_1', 80)->nullable();
            $table->string('pedido_renovacion_2', 50)->nullable();
            $table->string('fecha_renovacion_2', 80)->nullable();
            $table->string('pedido_renovacion_3', 50)->nullable();
            $table->string('fecha_renovacion_3', 80)->nullable();
            $table->string('pedido_renovacion_4', 50)->nullable();
            $table->string('fecha_renovacion_4', 80)->nullable();
            $table->string('pedido_renovacion_5', 50)->nullable();
            $table->string('fecha_renovacion_5', 80)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dotaciones');
    }
};
