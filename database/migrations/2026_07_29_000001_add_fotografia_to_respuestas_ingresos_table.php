<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('respuestas_ingresos', function (Blueprint $table) {
            $table->string('fotografia', 255)->nullable()->after('talla_zapatos');
        });
    }

    public function down(): void
    {
        Schema::table('respuestas_ingresos', function (Blueprint $table) {
            $table->dropColumn('fotografia');
        });
    }
};
