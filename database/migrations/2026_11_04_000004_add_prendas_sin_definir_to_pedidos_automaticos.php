<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Prendas del kit que no entraron al pedido automático porque no se sabe cuál es (el empleado
 * aún no tiene género o talla, o el contrato no tiene sede): se completan cuando llega el dato,
 * y mientras tanto el pedido no se puede entregar.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('pedidos_automaticos', 'prendas_sin_definir')) {
            Schema::table('pedidos_automaticos', function (Blueprint $table) {
                $table->json('prendas_sin_definir')->nullable()->after('notas');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('pedidos_automaticos', 'prendas_sin_definir')) {
            Schema::table('pedidos_automaticos', function (Blueprint $table) {
                $table->dropColumn('prendas_sin_definir');
            });
        }
    }
};
