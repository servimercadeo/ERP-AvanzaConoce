<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contratos', function (Blueprint $table) {
            $table->date('seguimiento_fecha_cierre')->nullable()->after('origen_seguimiento');
            $table->json('seguimiento_observaciones')->nullable()->after('seguimiento_fecha_cierre');
        });
    }

    public function down(): void
    {
        Schema::table('contratos', function (Blueprint $table) {
            $table->dropColumn(['seguimiento_fecha_cierre', 'seguimiento_observaciones']);
        });
    }
};
