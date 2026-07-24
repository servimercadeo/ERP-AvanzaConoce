<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('centros_costo_catalogo', function (Blueprint $table) {
            $table->dropUnique(['empresa', 'codigo']);
            $table->dropColumn('empresa');
        });

        Schema::table('contrato_centros_costos', function (Blueprint $table) {
            $table->dropColumn('empresa');
        });
    }

    public function down(): void
    {
        Schema::table('centros_costo_catalogo', function (Blueprint $table) {
            $table->string('empresa', 150)->nullable()->after('id');
        });
        Schema::table('centros_costo_catalogo', function (Blueprint $table) {
            $table->unique(['empresa', 'codigo']);
        });

        Schema::table('contrato_centros_costos', function (Blueprint $table) {
            $table->string('empresa', 150)->nullable()->after('contrato_id');
        });
    }
};
