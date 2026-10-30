<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jefe inmediato del aliado: un usuario del ERP (no técnico ni de rol general). Si el
     * usuario se elimina, el aliado queda sin jefe en vez de borrarse.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('aliados', 'jefe_inmediato_id')) {
            Schema::table('aliados', function (Blueprint $table) {
                $table->foreignId('jefe_inmediato_id')->nullable()->after('observaciones')
                    ->constrained('users')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('aliados', 'jefe_inmediato_id')) {
            Schema::table('aliados', function (Blueprint $table) {
                $table->dropConstrainedForeignId('jefe_inmediato_id');
            });
        }
    }
};
