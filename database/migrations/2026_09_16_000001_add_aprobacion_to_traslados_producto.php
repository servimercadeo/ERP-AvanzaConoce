<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Los traslados de inventario pedidos desde la revisión de stock de Pedidos ya no se
 * completan solos: quedan "Pendiente Aprobación" hasta que alguien los apruebe en
 * Inventario General > Aprobación de Traslado (ver TrasladoProductoController). Estas
 * columnas registran quién y cuándo aprobó (o rechazó) cada uno.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('traslados_producto', function (Blueprint $table) {
            if (!Schema::hasColumn('traslados_producto', 'aprobado_por')) {
                $table->string('aprobado_por', 150)->nullable()->after('solicitado_por');
            }
            if (!Schema::hasColumn('traslados_producto', 'aprobado_en')) {
                $table->timestamp('aprobado_en')->nullable()->after('aprobado_por');
            }
        });

        DB::statement("ALTER TABLE `" . DB::getTablePrefix() . "traslados_producto` MODIFY estado VARCHAR(30) NOT NULL DEFAULT 'Pendiente Aprobación'");
    }

    public function down(): void
    {
        Schema::table('traslados_producto', function (Blueprint $table) {
            if (Schema::hasColumn('traslados_producto', 'aprobado_en')) {
                $table->dropColumn('aprobado_en');
            }
            if (Schema::hasColumn('traslados_producto', 'aprobado_por')) {
                $table->dropColumn('aprobado_por');
            }
        });

        DB::statement("ALTER TABLE `" . DB::getTablePrefix() . "traslados_producto` MODIFY estado VARCHAR(30) NOT NULL DEFAULT 'Completado'");
    }
};
