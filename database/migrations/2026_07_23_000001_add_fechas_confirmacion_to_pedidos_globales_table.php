<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos_globales', function (Blueprint $table) {
            $table->timestamp('confirmado_at')->nullable()->after('confirmado');
            $table->timestamp('entrega_confirmada_at')->nullable()->after('entrega_confirmada');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_globales', function (Blueprint $table) {
            $table->dropColumn(['confirmado_at', 'entrega_confirmada_at']);
        });
    }
};
