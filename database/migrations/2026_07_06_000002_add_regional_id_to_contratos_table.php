<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contratos', function (Blueprint $table) {
            $table->foreignId('regional_id')->nullable()->after('cliente_proyecto')
                ->constrained('regionales')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('contratos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('regional_id');
        });
    }
};
