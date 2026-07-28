<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contrato_centros_costos', function (Blueprint $table) {
            $table->string('empresa', 150)->nullable()->after('contrato_id');
            $table->string('codigo', 30)->nullable()->after('empresa');
        });
    }

    public function down(): void
    {
        Schema::table('contrato_centros_costos', function (Blueprint $table) {
            $table->dropColumn(['empresa', 'codigo']);
        });
    }
};
