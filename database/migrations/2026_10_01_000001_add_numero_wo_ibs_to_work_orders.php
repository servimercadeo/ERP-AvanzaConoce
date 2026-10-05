<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "N° de WO de IBS" (columna AL del export): un número de WO distinto al que se usa
     * como llave de negocio (`numero_wo`, que en realidad sale de la columna "Nº de
     * cliente" — mal nombrada en el archivo de origen, pero ahí es donde vive el número
     * real de la orden). Se guarda aparte solo como referencia visible.
     */
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->string('numero_wo_ibs', 60)->nullable()->after('numero_item');
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropColumn('numero_wo_ibs');
        });
    }
};
