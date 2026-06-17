<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos_automaticos', function (Blueprint $table) {
            $table->boolean('inventario_descontado')->default(false)->after('estado_acta');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_automaticos', function (Blueprint $table) {
            $table->dropColumn('inventario_descontado');
        });
    }
};
