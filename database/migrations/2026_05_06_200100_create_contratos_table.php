<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contratos', function (Blueprint $table) {
            $table->id();

            // Vínculo con el empleado (tabla users)
            $table->foreignId('empleado_id')->constrained('users')->cascadeOnDelete();

            // Datos del contrato
            $table->string('tipo_contrato', 80)->nullable();
            $table->string('tipo_vinculacion', 30)->nullable();
            $table->string('cargo', 100)->nullable();
            $table->string('sede', 100)->nullable();
            $table->string('area_empresa', 100)->nullable();
            $table->string('jefe_inmediato', 150)->nullable();

            // Fechas y salario
            $table->date('fecha_ingreso')->nullable();
            $table->date('fecha_retiro')->nullable();
            $table->decimal('salario', 12, 2)->nullable();
            $table->decimal('auxilio_transporte_legal', 12, 2)->nullable();

            // Seguridad social del contrato (puede diferir de la del empleado)
            $table->string('arl', 100)->nullable();
            $table->date('fecha_vinculacion_arl')->nullable();
            $table->string('lps_afiliado', 100)->nullable();   // EPS en el contrato
            $table->date('fecha_vinculacion_lps')->nullable();
            $table->string('caja_compensacion', 100)->nullable();
            $table->date('fecha_vinculacion_caja')->nullable();
            $table->string('fondo_pensiones', 100)->nullable();
            $table->string('fondo_cesantias', 100)->nullable();

            // Estado y entidades
            $table->string('estado_contrato', 30)->default('Activo');
            $table->string('empleador', 150)->nullable();
            $table->string('empresa', 150)->nullable();
            $table->string('cliente_proyecto', 150)->nullable();
            $table->string('origen_seguimiento', 80)->nullable();

            $table->timestamps();
        });

        // Centros de costo del contrato (sección dinámica: varios por contrato)
        Schema::create('contrato_centros_costos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contrato_id')->constrained('contratos')->cascadeOnDelete();
            $table->string('centro_costos', 150);
            $table->decimal('porcentaje', 5, 2)->default(0);
            $table->timestamps();
        });

        // Anexos / Auxilios del contrato (sección dinámica: varios por contrato)
        Schema::create('contrato_anexos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contrato_id')->constrained('contratos')->cascadeOnDelete();
            $table->string('anexo_auxilio', 150);
            $table->decimal('valor', 12, 2)->nullable();
            $table->date('fecha_entrega_firma')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contrato_anexos');
        Schema::dropIfExists('contrato_centros_costos');
        Schema::dropIfExists('contratos');
    }
};
