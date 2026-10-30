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
    /**
     * Textos como TEXT (no VARCHAR): con las columnas de Macaw (000003) la fila de
     * `work_orders` supera el límite de InnoDB ("Row size too large", 8126 bytes) en modo
     * estricto; TEXT se guarda fuera de la fila. Idempotente: salta las que ya existan.
     */
    private const COLUMNAS = [
        'dias_atraso' => ['integer', 'fecha_estado'],
        'dias_atraso_sp' => ['integer', 'dias_atraso'],
        'estado_descarga' => ['text', 'estado'],
        'estado_orden_trabajo' => ['text', 'estado_descarga'],
        'estado_visita' => ['text', 'estado_orden_trabajo'],
        'estado_en_fecha' => ['dateTime', 'estado_visita'],
        'georreferencia' => ['text', 'region_servicio'],
        'nombre_cuadrilla_tecnico' => ['text', 'cuadrilla_tecnico'],
        'apellido_cuadrilla_tecnico' => ['text', 'nombre_cuadrilla_tecnico'],
        'cambio_domicilio_entre_calles' => ['text', 'direccion'],
        'pais' => ['text', 'departamento'],
        'puntos_referencia' => ['text', 'barrio'],
        'codigo_postal' => ['text', 'pais'],
        'agrupacion' => ['text', 'codigo_postal'],
        'telefono_principal' => ['text', 'no_documento_cliente'],
        'recursos' => ['text', 'servicio'],
        'fecha_ultima_reasignacion' => ['dateTime', 'fecha_vencimiento'],
        'reiteracion_servicio' => ['integer', 'region_servicio'],
        'numero_visita' => ['text', 'estado_visita'],
        'coordenada_x' => ['text', 'numero_visita'],
        'coordenada_y' => ['text', 'coordenada_x'],
        'razones' => ['text', 'problema'],
        'numero_orden_trabajo' => ['text', 'numero_wo'],
        'codigo_sl' => ['text', 'servicio'],
        'clase_cliente' => ['text', 'tipo_orden'],
        'agendamiento_externo' => ['text', 'clase_cliente'],
        'descarga_materiales_obligatoria' => ['text', 'aging'],
        'descarga_materiales_confirmada' => ['text', 'descarga_materiales_obligatoria'],
        'id_encabezado_pedido' => ['text', 'numero_orden_trabajo'],
    ];

    public function up(): void
    {
        $faltan = array_filter(self::COLUMNAS, fn ($c, $nombre) => !Schema::hasColumn('work_orders', $nombre), ARRAY_FILTER_USE_BOTH);
        if (!$faltan) {
            return;
        }
        Schema::table('work_orders', function (Blueprint $table) use ($faltan) {
            foreach ($faltan as $nombre => [$tipo, $despues]) {
                $table->{$tipo}($nombre)->nullable()->after($despues);
            }
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
