<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidatos', function (Blueprint $table) {
            $table->foreignId('empleador_id')->nullable()->after('tipo_vinculacion')
                ->constrained('empleadores')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('candidatos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('empleador_id');
        });
    }
};
