<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('empleador', 150)->nullable()->after('empresa_id');
            $table->string('jefe_inmediato', 150)->nullable()->after('empleador');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['empleador', 'jefe_inmediato']);
        });
    }
};
