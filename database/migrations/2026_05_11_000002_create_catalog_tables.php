<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cargos', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('nombre', 150);
            $table->timestamps();
        });

        Schema::create('eps', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('nombre', 100);
            $table->timestamps();
        });

        Schema::create('tipos_rh', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('nombre', 10);
            $table->timestamps();
        });

        Schema::create('estados_civil', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('nombre', 60);
            $table->timestamps();
        });

        Schema::create('empleadores', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('nombre', 150);
            $table->timestamps();
        });

        Schema::create('bancos', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('nombre', 100);
            $table->timestamps();
        });

        Schema::create('arls', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('nombre', 100);
            $table->timestamps();
        });

        Schema::create('cajas_compensacion', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('nombre', 100);
            $table->timestamps();
        });

        Schema::create('ciudades', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('nombre', 100);
            $table->unsignedBigInteger('id_departamento')->nullable();
            $table->decimal('valor_flete', 12, 2)->nullable();
            $table->string('codigo_dane', 10)->nullable();
            $table->string('codigo_dep', 5)->nullable();
            $table->string('codigo_ciu', 5)->nullable();
            $table->string('perimetro', 30)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ciudades');
        Schema::dropIfExists('cajas_compensacion');
        Schema::dropIfExists('arls');
        Schema::dropIfExists('bancos');
        Schema::dropIfExists('empleadores');
        Schema::dropIfExists('estados_civil');
        Schema::dropIfExists('tipos_rh');
        Schema::dropIfExists('eps');
        Schema::dropIfExists('cargos');
    }
};
