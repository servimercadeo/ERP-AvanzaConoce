<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El "Excel de origen del proveedor" (el otro formato de import, distinto al Exporte
     * Macaw) trae columnas que hasta ahora se descartaban al importar. El usuario pegó la
     * fila 1 de ese archivo real y pidió agregar todo lo que faltara.
     */
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->integer('dias_atraso')->nullable()->after('fecha_estado');
            $table->integer('dias_atraso_sp')->nullable()->after('dias_atraso');
            $table->string('estado_descarga', 60)->nullable()->after('estado');
            $table->string('estado_orden_trabajo', 80)->nullable()->after('estado_descarga');
            $table->string('estado_visita', 60)->nullable()->after('estado_orden_trabajo');
            $table->dateTime('estado_en_fecha')->nullable()->after('estado_visita');
            $table->string('georreferencia', 60)->nullable()->after('region_servicio');
            $table->string('nombre_cuadrilla_tecnico', 100)->nullable()->after('cuadrilla_tecnico');
            $table->string('apellido_cuadrilla_tecnico', 100)->nullable()->after('nombre_cuadrilla_tecnico');
            $table->string('cambio_domicilio_entre_calles', 255)->nullable()->after('direccion');
            $table->string('pais', 60)->nullable()->after('departamento');
            $table->string('puntos_referencia', 150)->nullable()->after('barrio');
            $table->string('codigo_postal', 30)->nullable()->after('pais');
            $table->string('agrupacion', 60)->nullable()->after('codigo_postal');
            $table->string('telefono_principal', 40)->nullable()->after('no_documento_cliente');
            $table->string('recursos', 150)->nullable()->after('servicio');
            $table->dateTime('fecha_ultima_reasignacion')->nullable()->after('fecha_vencimiento');
            $table->integer('reiteracion_servicio')->nullable()->after('region_servicio');
            $table->string('numero_visita', 60)->nullable()->after('estado_visita');
            $table->string('coordenada_x', 30)->nullable()->after('numero_visita');
            $table->string('coordenada_y', 30)->nullable()->after('coordenada_x');
            $table->string('razones', 255)->nullable()->after('problema');
            $table->string('numero_orden_trabajo', 60)->nullable()->after('numero_wo');
            $table->string('codigo_sl', 30)->nullable()->after('servicio');
            $table->string('clase_cliente', 60)->nullable()->after('tipo_orden');
            $table->string('agendamiento_externo', 20)->nullable()->after('clase_cliente');
            $table->string('descarga_materiales_obligatoria', 20)->nullable()->after('aging');
            $table->string('descarga_materiales_confirmada', 20)->nullable()->after('descarga_materiales_obligatoria');
            $table->string('id_encabezado_pedido', 60)->nullable()->after('numero_orden_trabajo');
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropColumn([
                'dias_atraso', 'dias_atraso_sp', 'estado_descarga', 'estado_orden_trabajo',
                'estado_visita', 'estado_en_fecha', 'georreferencia', 'nombre_cuadrilla_tecnico',
                'apellido_cuadrilla_tecnico', 'cambio_domicilio_entre_calles', 'pais',
                'puntos_referencia', 'codigo_postal', 'agrupacion', 'telefono_principal',
                'recursos', 'fecha_ultima_reasignacion', 'reiteracion_servicio', 'numero_visita',
                'coordenada_x', 'coordenada_y', 'razones', 'numero_orden_trabajo', 'codigo_sl',
                'clase_cliente', 'agendamiento_externo', 'descarga_materiales_obligatoria',
                'descarga_materiales_confirmada', 'id_encabezado_pedido',
            ]);
        });
    }
};
