<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos_globales', function (Blueprint $table) {
            $table->string('cliente_proyecto', 150)->nullable()->after('fecha');
            $table->foreignId('regional_id')->nullable()->after('cliente_proyecto')
                ->constrained('regionales')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_globales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('regional_id');
            $table->dropColumn('cliente_proyecto');
        });
    }
};
