<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Work Orders (Inventarios > Work Orders): visor de las órdenes de trabajo técnicas
     * que llegan por archivo plano (export típico de DirecTV/proveedores de campo, con 50+
     * columnas). Se guardan solo las columnas más relevantes para seguimiento operativo. Un
     * mismo `numero_wo` puede repetirse en varias filas del archivo — una por cada ítem
     * (material/línea) de esa orden — así que la llave real de negocio para reimportar sin
     * duplicar es el PAR `numero_wo` + `numero_item`, no `numero_wo` solo.
     */
    public function up(): void
    {
        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();
            $table->string('numero_wo', 60);
            $table->string('numero_item', 30)->nullable();
            $table->string('estado', 80)->nullable();
            $table->dateTime('fecha_estado')->nullable();
            $table->string('servicio', 120)->nullable();
            $table->string('tipo_orden', 120)->nullable();
            $table->string('prioridad', 60)->nullable();
            $table->string('proveedor', 150)->nullable();
            // Identidad legible del técnico: "Cuadrilla/Técnico Responsable" en el archivo de
            // origen es un login técnico tipo correo (ej. LMENACAR1@DTVEXT...), no un nombre
            // de persona — por eso el nombre/cédula reales van en columnas propias (NOMBRE TH /
            // CEDULA en el export), que son las que de verdad sirven para identificar a alguien.
            $table->string('cuadrilla_tecnico', 150)->nullable();
            $table->string('nombre_tecnico', 150)->nullable();
            $table->string('cedula_tecnico', 30)->nullable();
            $table->string('modalidad', 60)->nullable();
            $table->string('perimetro', 60)->nullable();
            $table->string('departamento', 100)->nullable();
            $table->string('municipio', 100)->nullable();
            $table->string('barrio', 150)->nullable();
            $table->string('direccion', 255)->nullable();
            $table->dateTime('fecha_creacion')->nullable();
            $table->dateTime('fecha_vencimiento')->nullable();
            $table->dateTime('fecha_finalizacion')->nullable();
            $table->string('inicio_agendado', 60)->nullable();
            $table->string('fin_agendado', 60)->nullable();
            $table->text('descripcion')->nullable();
            $table->integer('aging')->nullable();
            $table->string('region_servicio', 100)->nullable();
            $table->timestamps();

            $table->unique(['numero_wo', 'numero_item']);
            $table->index('estado');
            $table->index('municipio');
            $table->index('proveedor');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_orders');
    }
};
