<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Lo que encontró `erp:revisar-bd` en producción: tablas creadas a mano en latin1 y columnas de
 * work_orders más cortas de lo definido, que fallan al guardar textos largos o símbolos. El orden
 * importa: primero a TEXT, que libera espacio en la fila, y luego a utf8mb4, que hace crecer las
 * demás columnas; al revés puede fallar con "Row size too large". Solo toca lo que hace falta.
 */
return new class extends Migration
{
    private const COLUMNAS_TEXTO_WORK_ORDERS = [
        'numero_orden_trabajo', 'id_encabezado_pedido', 'estado_descarga', 'estado_orden_trabajo',
        'estado_visita', 'numero_visita', 'coordenada_x', 'coordenada_y', 'codigo_sl', 'recursos',
        'clase_cliente', 'agendamiento_externo', 'nombre_cuadrilla_tecnico', 'apellido_cuadrilla_tecnico',
        'nombre_tecnico_cierre', 'cedula_tecnico_cierre', 'pais', 'codigo_postal', 'agrupacion',
        'puntos_referencia', 'cambio_domicilio_entre_calles', 'descarga_materiales_obligatoria',
        'descarga_materiales_confirmada', 'georreferencia', 'razones', 'telefono_principal',
    ];

    private const TABLAS = ['work_orders', 'tipos_parametro', 'valores_parametro'];

    public function up(): void
    {
        $prefijo = DB::getTablePrefix();
        $tablaWo = "{$prefijo}work_orders";

        $varchar = array_map(fn ($c) => $c->columna, DB::select(
            "select column_name as columna from information_schema.columns
             where table_schema = database() and table_name = ? and data_type in ('varchar', 'char')",
            [$tablaWo],
        ));
        $cambios = array_map(
            fn ($c) => "MODIFY `{$c}` TEXT NULL",
            array_values(array_intersect(self::COLUMNAS_TEXTO_WORK_ORDERS, $varchar)),
        );
        if ($cambios) {
            DB::statement("ALTER TABLE `{$tablaWo}` " . implode(', ', $cambios));
        }

        foreach (self::TABLAS as $tabla) {
            $sinConvertir = DB::selectOne(
                "select count(*) as n from information_schema.columns
                 where table_schema = database() and table_name = ? and character_set_name is not null and character_set_name <> 'utf8mb4'",
                ["{$prefijo}{$tabla}"],
            )->n;
            if ($sinConvertir > 0) {
                DB::statement("ALTER TABLE `{$prefijo}{$tabla}` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            }
        }
    }

    public function down(): void
    {
        // No se revierte: volver atrás perdería textos largos y símbolos ya guardados.
    }
};
