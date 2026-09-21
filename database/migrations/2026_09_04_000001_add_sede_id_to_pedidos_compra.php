<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos_compra', function (Blueprint $table) {
            // 'sede' sigue como texto (ya viene del catálogo real de sedes desde que
            // el formulario dejó de usar la lista ficticia), 'sede_id' es la FK real
            // que necesita la revisión de stock para saber la sede pedida de verdad.
            $table->foreignId('sede_id')->nullable()->after('sede')->constrained('sedes')->nullOnDelete();
        });

        // Backfill: relaciona cada pedido existente con su sede real por nombre exacto.
        DB::statement('
            UPDATE pedidos_compra pc
            JOIN sedes s ON UPPER(s.nombre) = UPPER(pc.sede)
            SET pc.sede_id = s.id
            WHERE pc.sede_id IS NULL
        ');
    }

    public function down(): void
    {
        Schema::table('pedidos_compra', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sede_id');
        });
    }
};
