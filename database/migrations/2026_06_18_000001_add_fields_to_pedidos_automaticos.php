<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos_automaticos', function (Blueprint $table) {
            $table->string('codigo', 10)->nullable()->unique()->after('estado');
            $table->foreignId('contrato_id')->nullable()->constrained('contratos')->nullOnDelete()->after('codigo');
            $table->foreignId('empleado_id')->nullable()->constrained('users')->nullOnDelete()->after('contrato_id');
            $table->date('fecha_pedido')->nullable()->after('empleado_id');
            $table->text('notas')->nullable()->after('fecha_pedido');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_automaticos', function (Blueprint $table) {
            $table->dropForeign(['contrato_id']);
            $table->dropForeign(['empleado_id']);
            $table->dropColumn(['codigo', 'contrato_id', 'empleado_id', 'fecha_pedido', 'notas']);
        });
    }
};
