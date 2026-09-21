<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Asignado a" (Pedidos y Compras > Asignación de Pedidos) es distinto de
     * `responsable`: `responsable` es quién PIDIÓ el insumo, `asignado_a_user_id` es
     * quién quedó a cargo de GESTIONARLO (cotizar, comprar, hacer seguimiento). Un
     * pedido puede no tener nadie asignado todavía (queda "sin asignar").
     */
    public function up(): void
    {
        Schema::table('pedidos_compra', function (Blueprint $table) {
            $table->foreignId('asignado_a_user_id')->nullable()->after('registra')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_compra', function (Blueprint $table) {
            $table->dropConstrainedForeignId('asignado_a_user_id');
        });
    }
};
