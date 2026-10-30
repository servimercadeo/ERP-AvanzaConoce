<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Quién cerró la WO desde el ERP (cambio de estado hecho por un técnico directo),
     * distinto de `nombre_tecnico`/`cedula_tecnico` (que vienen del archivo del proveedor y
     * son el técnico asignado/agendado) y distinto también del campo que usan los técnicos
     * para ver sus propias WO (`cedula_tecnico`, que esto no toca).
     */
    public function up(): void
    {
        // TEXT por el límite de tamaño de fila de `work_orders` (ver 000004). Idempotente.
        Schema::table('work_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('work_orders', 'nombre_tecnico_cierre')) {
                $table->text('nombre_tecnico_cierre')->nullable()->after('cedula_tecnico_agendado');
            }
            if (!Schema::hasColumn('work_orders', 'cedula_tecnico_cierre')) {
                $table->text('cedula_tecnico_cierre')->nullable()->after('nombre_tecnico_cierre');
            }
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropColumn(['nombre_tecnico_cierre', 'cedula_tecnico_cierre']);
        });
    }
};
