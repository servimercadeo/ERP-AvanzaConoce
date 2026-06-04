<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('base_ingresos', function (Blueprint $table) {
            $table->boolean('alerta_enviada')->default(false)->after('estado');
        });
    }

    public function down(): void
    {
        Schema::table('base_ingresos', function (Blueprint $table) {
            $table->dropColumn('alerta_enviada');
        });
    }
};
