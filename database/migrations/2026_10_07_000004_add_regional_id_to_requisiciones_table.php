<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Idempotente: en producción la columna puede haberse creado a mano.
        if (Schema::hasColumn('requisiciones', 'regional_id')) {
            return;
        }

        Schema::table('requisiciones', function (Blueprint $table) {
            $table->foreignId('regional_id')->nullable()->after('sede_id')
                ->constrained('regionales')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('requisiciones', 'regional_id')) {
            return;
        }

        Schema::table('requisiciones', function (Blueprint $table) {
            $table->dropConstrainedForeignId('regional_id');
        });
    }
};
