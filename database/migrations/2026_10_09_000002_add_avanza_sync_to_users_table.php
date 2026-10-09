<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Estado de la creación del usuario en AvanzaConoce al dar de alta a un empleado
     * (ver App\Services\AltaEnAvanzaConoce): null = no aplica / nunca se intentó,
     * 'pendiente' y 'error' = se reintenta (comando avanza:sincronizar-usuarios),
     * 'conflicto' = AvanzaConoce lo rechazó por un dato que hay que corregir a mano
     * (p. ej. correo de otra persona), 'ok' = existe allá con la misma contraseña.
     *
     * Idempotente: producción puede tener columnas creadas a mano.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'avanza_sync_estado')) {
                $table->string('avanza_sync_estado', 20)->nullable()->after('avanzaconoce_id');
            }
            if (!Schema::hasColumn('users', 'avanza_sync_error')) {
                $table->string('avanza_sync_error', 500)->nullable()->after('avanza_sync_estado');
            }
            if (!Schema::hasColumn('users', 'avanza_sync_at')) {
                $table->timestamp('avanza_sync_at')->nullable()->after('avanza_sync_error');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            foreach (['avanza_sync_at', 'avanza_sync_error', 'avanza_sync_estado'] as $columna) {
                if (Schema::hasColumn('users', $columna)) {
                    $table->dropColumn($columna);
                }
            }
        });
    }
};
