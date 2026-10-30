<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El "Exporte Macaw" (hoja de Operaciones DTV) trae ~68 columnas y solo se estaban
     * consumiendo ~15; el resto se exportaban como "N/D" aunque el archivo de origen sí las
     * trae. Se agregan como columnas propias (import y export las usan ahora de verdad).
     * Fuera quedan solo: "subproducto" en minúscula (duplicado numérico de "Subproducto",
     * decisión del usuario de ignorarlo) y lo que ya vivía en `work_orders`/en la ficha del
     * técnico (ver WorkOrderController::conDatosDelTecnico).
     */
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->string('subproducto', 150)->nullable()->after('servicio');
            $table->string('tipo_producto', 60)->nullable()->after('tipo_orden');
            $table->string('se_paga', 20)->nullable()->after('tipo_producto');
            $table->string('consignada', 20)->nullable()->after('se_paga');
            $table->string('pago', 40)->nullable()->after('consignada');
            $table->string('tecnico_agendado', 150)->nullable()->after('nombre_tecnico');
            $table->string('cedula_tecnico_agendado', 30)->nullable()->after('tecnico_agendado');
            $table->string('categoria', 100)->nullable()->after('region_servicio');
            $table->text('problema')->nullable()->after('categoria');
            $table->string('nombre_cliente', 150)->nullable()->after('problema');
            $table->string('apellido_cliente', 150)->nullable()->after('nombre_cliente');
            $table->string('no_documento_cliente', 30)->nullable()->after('apellido_cliente');
            $table->string('tel_casa', 40)->nullable()->after('direccion');
            $table->string('perimetro_venta', 60)->nullable()->after('perimetro');
            $table->string('jornada', 60)->nullable()->after('no_documento_cliente');
            $table->dateTime('fecha_programacion')->nullable()->after('jornada');
            $table->dateTime('fecha_publicacion')->nullable()->after('fecha_finalizacion');
            $table->string('tecnologia', 60)->nullable()->after('fecha_publicacion');
            $table->dateTime('fecha_cancelacion')->nullable()->after('estado');
            $table->string('razon_cancelacion', 150)->nullable()->after('fecha_cancelacion');
            $table->text('observaciones_cancelacion')->nullable()->after('razon_cancelacion');
            $table->string('estado_comercial', 60)->nullable()->after('observaciones_cancelacion');
            $table->string('tipo_wo', 60)->nullable()->after('estado_comercial');
            $table->string('tecnico_atendio_flag', 20)->nullable()->after('tipo_wo');
            $table->string('wo_anterior', 60)->nullable()->after('tecnico_atendio_flag');
            $table->string('wo_fisica_ok', 60)->nullable()->after('wo_anterior');
            $table->string('motivo', 150)->nullable()->after('wo_fisica_ok');
            $table->string('consumio_material', 20)->nullable()->after('motivo');
            $table->string('paga_por_directv', 60)->nullable()->after('consumio_material');
            $table->string('comision_pagada', 20)->nullable()->after('paga_por_directv');
            $table->string('valor_comision', 40)->nullable()->after('comision_pagada');
            $table->dateTime('fecha_pago')->nullable()->after('valor_comision');
            $table->string('prueba_calidad', 60)->nullable()->after('fecha_pago');
            $table->string('numero_ticket_aprobacion', 60)->nullable()->after('prueba_calidad');
            $table->text('razon_prueba_calidad_fallida')->nullable()->after('numero_ticket_aprobacion');
            $table->string('contrato_enviado', 20)->nullable()->after('razon_prueba_calidad_fallida');
            $table->string('registrado_por', 150)->nullable()->after('contrato_enviado');
            $table->dateTime('fecha_registro_material')->nullable()->after('registrado_por');
            $table->dateTime('fecha_registro_sin_material')->nullable()->after('fecha_registro_material');
            $table->string('modo_atencion', 60)->nullable()->after('fecha_registro_sin_material');
            $table->string('auxiliar', 150)->nullable()->after('modo_atencion');
            $table->string('torre', 150)->nullable()->after('auxiliar');
            $table->string('conductor', 150)->nullable()->after('torre');
            $table->string('tipo_auxilio', 60)->nullable()->after('conductor');
            $table->string('auxilio', 40)->nullable()->after('tipo_auxilio');
            $table->string('aplica_auxilio', 100)->nullable()->after('auxilio');
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropColumn([
                'subproducto', 'tipo_producto', 'se_paga', 'consignada', 'pago',
                'tecnico_agendado', 'cedula_tecnico_agendado', 'categoria', 'problema',
                'nombre_cliente', 'apellido_cliente', 'no_documento_cliente', 'tel_casa',
                'perimetro_venta', 'jornada', 'fecha_programacion', 'fecha_publicacion',
                'tecnologia', 'fecha_cancelacion', 'razon_cancelacion', 'observaciones_cancelacion',
                'estado_comercial', 'tipo_wo', 'tecnico_atendio_flag', 'wo_anterior', 'wo_fisica_ok',
                'motivo', 'consumio_material', 'paga_por_directv', 'comision_pagada', 'valor_comision',
                'fecha_pago', 'prueba_calidad', 'numero_ticket_aprobacion', 'razon_prueba_calidad_fallida',
                'contrato_enviado', 'registrado_por', 'fecha_registro_material', 'fecha_registro_sin_material',
                'modo_atencion', 'auxiliar', 'torre', 'conductor', 'tipo_auxilio', 'auxilio', 'aplica_auxilio',
            ]);
        });
    }
};
