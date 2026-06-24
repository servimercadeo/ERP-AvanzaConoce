<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->date('fecha_expedicion')->nullable()->after('cedula');
            $table->string('profesion', 150)->nullable()->after('nivel_escolaridad');
            $table->string('talla_camisa', 20)->nullable()->after('alergias');
            $table->string('talla_pantalon', 20)->nullable()->after('talla_camisa');
            $table->string('talla_zapatos', 20)->nullable()->after('talla_pantalon');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['fecha_expedicion', 'profesion', 'talla_camisa', 'talla_pantalon', 'talla_zapatos']);
        });
    }
};
