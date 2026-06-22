<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos_globales', function (Blueprint $table) {
            $table->boolean('confirmado')->default(false)->after('notas');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_globales', function (Blueprint $table) {
            $table->dropColumn('confirmado');
        });
    }
};
