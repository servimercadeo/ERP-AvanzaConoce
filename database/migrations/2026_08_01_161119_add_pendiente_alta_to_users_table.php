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
            // true = el registro nació de un import de contratos (o similar) y todavía no fue
            // dado de alta manualmente en el módulo Empleados, así que no debe listarse ahí ni
            // tratarse como si ya tuviera credenciales asignadas.
            $table->boolean('pendiente_alta')->default(false)->after('activo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('pendiente_alta');
        });
    }
};
