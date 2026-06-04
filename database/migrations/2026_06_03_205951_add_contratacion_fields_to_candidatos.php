<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidatos', function (Blueprint $table) {
            $table->string('lugar_trabajo')->nullable()->after('auxilio_alimentacion');
            $table->date('fecha_programacion_ingreso')->nullable()->after('lugar_trabajo');
            $table->date('fecha_correccion')->nullable()->after('fecha_programacion_ingreso');
        });
    }

    public function down(): void
    {
        Schema::table('candidatos', function (Blueprint $table) {
            $table->dropColumn(['lugar_trabajo', 'fecha_programacion_ingreso', 'fecha_correccion']);
        });
    }
};
