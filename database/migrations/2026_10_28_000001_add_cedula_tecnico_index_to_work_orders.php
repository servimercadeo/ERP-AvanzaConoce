<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Las WOs se buscan por la cédula del técnico: lo que ve el rol técnico y los contadores
     * de Aliados (join con users.cedula). Sin índice, cada consulta recorre toda la tabla.
     */
    public function up(): void
    {
        if (!Schema::hasIndex('work_orders', ['cedula_tecnico'])) {
            Schema::table('work_orders', function (Blueprint $table) {
                $table->index('cedula_tecnico');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasIndex('work_orders', ['cedula_tecnico'])) {
            Schema::table('work_orders', function (Blueprint $table) {
                $table->dropIndex(['cedula_tecnico']);
            });
        }
    }
};
