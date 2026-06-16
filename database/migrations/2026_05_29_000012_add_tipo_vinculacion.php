<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidatos', function (Blueprint $table) {
            $table->string('tipo_vinculacion', 20)->nullable()->after('aval');
        });

        Schema::table('base_ingresos', function (Blueprint $table) {
            $table->string('tipo_vinculacion', 20)->nullable()->after('tipo_ingreso');
        });
    }

    public function down(): void
    {
        Schema::table('candidatos', function (Blueprint $table) {
            $table->dropColumn('tipo_vinculacion');
        });

        Schema::table('base_ingresos', function (Blueprint $table) {
            $table->dropColumn('tipo_vinculacion');
        });
    }
};
