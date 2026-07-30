<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empleadores', function (Blueprint $table) {
            $table->string('tipo', 20)->default('Indirecto')->after('nombre');
        });

        // Solo Servimercadeo y Servicios y Mercadeo son empleadores directos; el resto (temporales,
        // SENA, asesores externos, etc.) quedan como "Indirecto" por el valor por defecto de la columna.
        DB::table('empleadores')
            ->where('nombre', 'SERVIMERCADEO')
            ->orWhere('nombre', 'like', '%SERVICIOS Y MERCADEO%')
            ->update(['tipo' => 'Directo']);
    }

    public function down(): void
    {
        Schema::table('empleadores', function (Blueprint $table) {
            $table->dropColumn('tipo');
        });
    }
};
