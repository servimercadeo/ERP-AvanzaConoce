<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * En el flujo real, el contrato se crea antes de que la persona tenga
     * cuenta de usuario en el ERP (el usuario se crea después, a partir del
     * contrato). empleado_id sigue siendo FK a users, solo deja de ser
     * obligatorio.
     */
    public function up(): void
    {
        Schema::table('contratos', function (Blueprint $table) {
            $table->unsignedBigInteger('empleado_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('contratos', function (Blueprint $table) {
            $table->unsignedBigInteger('empleado_id')->nullable(false)->change();
        });
    }
};
