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
        Schema::table('users', function (Blueprint $table) {
            $table->string('jefe_inmediato_nombre', 150)->nullable()->after('jefe_inmediato');
            $table->string('jefe_inmediato_correo', 180)->nullable()->after('jefe_inmediato_nombre');
        });

        Schema::table('contratos', function (Blueprint $table) {
            $table->string('jefe_inmediato_nombre', 150)->nullable()->after('jefe_inmediato');
            $table->string('jefe_inmediato_correo', 180)->nullable()->after('jefe_inmediato_nombre');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['jefe_inmediato_nombre', 'jefe_inmediato_correo']);
        });

        Schema::table('contratos', function (Blueprint $table) {
            $table->dropColumn(['jefe_inmediato_nombre', 'jefe_inmediato_correo']);
        });
    }
};
