<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El listado de Work Orders ordena por fecha_estado (y id) y pagina: sin índice, cada
     * página recorre y ordena la tabla entera (miles de filas de 106 columnas). El técnico
     * además filtra por su cédula. Idempotente (producción puede tenerlos creados a mano).
     */
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            if (!Schema::hasIndex('work_orders', 'work_orders_fecha_estado_id_index')) {
                $table->index(['fecha_estado', 'id'], 'work_orders_fecha_estado_id_index');
            }
            if (!Schema::hasIndex('work_orders', 'work_orders_cedula_fecha_estado_index')) {
                $table->index(['cedula_tecnico', 'fecha_estado', 'id'], 'work_orders_cedula_fecha_estado_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            if (Schema::hasIndex('work_orders', 'work_orders_fecha_estado_id_index')) {
                $table->dropIndex('work_orders_fecha_estado_id_index');
            }
            if (Schema::hasIndex('work_orders', 'work_orders_cedula_fecha_estado_index')) {
                $table->dropIndex('work_orders_cedula_fecha_estado_index');
            }
        });
    }
};
