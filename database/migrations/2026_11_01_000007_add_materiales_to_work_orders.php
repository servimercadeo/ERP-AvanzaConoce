<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Materiales que consumió cada WO: el "Exporte Macaw" (archivo de Operaciones DTV) trae
     * una columna por material (CABLE COAXIAL, GRAPA BLANCA, AMARRAS BLANCAS...) con la
     * cantidad. Se guardan como {"nombre de la columna": cantidad} para devolverlas en el
     * Exportar en la misma posición que en ese archivo.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('work_orders', 'materiales')) {
            Schema::table('work_orders', function (Blueprint $table) {
                $table->json('materiales')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('work_orders', 'materiales')) {
            Schema::table('work_orders', function (Blueprint $table) {
                $table->dropColumn('materiales');
            });
        }
    }
};
