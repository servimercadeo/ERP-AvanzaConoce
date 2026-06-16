<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('candidatos', function (Blueprint $table) {
            $table->string('arl', 120)->nullable()->after('tasa_riesgo_arl');
            $table->string('caja_compensacion', 120)->nullable()->after('arl');
        });
    }

    public function down(): void
    {
        Schema::table('candidatos', function (Blueprint $table) {
            $table->dropColumn(['arl', 'caja_compensacion']);
        });
    }
};
