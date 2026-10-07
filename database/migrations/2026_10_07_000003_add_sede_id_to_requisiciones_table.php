<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Idempotente: en producción la columna puede haberse creado a mano.
        if (Schema::hasColumn('requisiciones', 'sede_id')) {
            return;
        }

        Schema::table('requisiciones', function (Blueprint $table) {
            $table->foreignId('sede_id')->nullable()->after('ciudad_id')
                ->constrained('sedes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('requisiciones', 'sede_id')) {
            return;
        }

        Schema::table('requisiciones', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sede_id');
        });
    }
};
