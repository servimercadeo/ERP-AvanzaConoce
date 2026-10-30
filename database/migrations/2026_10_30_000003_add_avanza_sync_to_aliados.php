<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El aliado empresa también se crea como usuario de AvanzaConoce (rol "Aliado"), igual que
     * los empleados en erp_users: estado del envío, id allá y el hash bcrypt de su contraseña
     * (se manda el hash, nunca la clave en claro; se guarda para poder reintentar).
     */
    public function up(): void
    {
        Schema::table('aliados', function (Blueprint $table) {
            if (!Schema::hasColumn('aliados', 'avanza_password')) {
                $table->string('avanza_password', 255)->nullable()->after('activo');
            }
            if (!Schema::hasColumn('aliados', 'avanzaconoce_id')) {
                $table->unsignedBigInteger('avanzaconoce_id')->nullable()->after('avanza_password');
            }
            if (!Schema::hasColumn('aliados', 'avanza_sync_estado')) {
                $table->string('avanza_sync_estado', 20)->nullable()->after('avanzaconoce_id');
            }
            if (!Schema::hasColumn('aliados', 'avanza_sync_error')) {
                $table->string('avanza_sync_error', 500)->nullable()->after('avanza_sync_estado');
            }
            if (!Schema::hasColumn('aliados', 'avanza_sync_at')) {
                $table->timestamp('avanza_sync_at')->nullable()->after('avanza_sync_error');
            }
        });
    }

    public function down(): void
    {
        Schema::table('aliados', function (Blueprint $table) {
            foreach (['avanza_password', 'avanzaconoce_id', 'avanza_sync_estado', 'avanza_sync_error', 'avanza_sync_at'] as $columna) {
                if (Schema::hasColumn('aliados', $columna)) {
                    $table->dropColumn($columna);
                }
            }
        });
    }
};
