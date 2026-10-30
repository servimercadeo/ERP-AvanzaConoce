<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aliado empresa: código de punto de venta (PDV) y modalidad. La modalidad se guarda con
     * el id de Bitrix (`modalidades_bt.id_bt` de AvanzaConoce), igual que `users.id_modalidad_bt`
     * allá; el nombre se lee de ese catálogo.
     */
    public function up(): void
    {
        Schema::table('aliados', function (Blueprint $table) {
            if (!Schema::hasColumn('aliados', 'codigo_pdv')) {
                $table->string('codigo_pdv', 20)->nullable()->after('nombre');
            }
            if (!Schema::hasColumn('aliados', 'modalidad_id_bt')) {
                $table->unsignedInteger('modalidad_id_bt')->nullable()->after('codigo_pdv');
            }
        });
    }

    public function down(): void
    {
        Schema::table('aliados', function (Blueprint $table) {
            foreach (['codigo_pdv', 'modalidad_id_bt'] as $columna) {
                if (Schema::hasColumn('aliados', $columna)) {
                    $table->dropColumn($columna);
                }
            }
        });
    }
};
