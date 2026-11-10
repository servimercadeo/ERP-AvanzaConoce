<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Quién acompañó, por id y no solo por nombre: así su auxilio se cuenta bien aunque
    // alguien cambie de nombre o dos personas se llamen parecido.
    public function up(): void
    {
        if (Schema::hasColumn('work_orders', 'auxiliar_user_id')) {
            return;
        }

        Schema::table('work_orders', function (Blueprint $table) {
            $table->foreignId('auxiliar_user_id')->nullable()->after('auxiliar')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('work_orders', 'auxiliar_user_id')) {
            return;
        }

        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropForeign(['auxiliar_user_id']);
            $table->dropColumn('auxiliar_user_id');
        });
    }
};
