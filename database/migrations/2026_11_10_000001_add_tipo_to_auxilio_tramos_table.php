<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El Auxilio por Productividad pasa a tener dos escalas: la del TÉCNICO que finaliza la
     * Work Order y la del AUXILIAR que lo acompañó. Los tramos que ya existían son los del
     * técnico, así que quedan marcados como tales.
     */
    public function up(): void
    {
        if (Schema::hasColumn('auxilio_tramos', 'tipo')) {
            return;
        }

        Schema::table('auxilio_tramos', function (Blueprint $table) {
            $table->string('tipo', 20)->default('tecnico')->after('id')->index();
        });
        DB::table('auxilio_tramos')->update(['tipo' => 'tecnico']);
    }

    public function down(): void
    {
        if (!Schema::hasColumn('auxilio_tramos', 'tipo')) {
            return;
        }

        Schema::table('auxilio_tramos', fn (Blueprint $table) => $table->dropColumn('tipo'));
    }
};
