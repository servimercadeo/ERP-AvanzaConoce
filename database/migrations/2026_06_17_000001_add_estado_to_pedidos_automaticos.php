<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos_automaticos', function (Blueprint $table) {
            $table->string('estado', 20)->default('Activo')->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_automaticos', function (Blueprint $table) {
            $table->dropColumn('estado');
        });
    }
};
