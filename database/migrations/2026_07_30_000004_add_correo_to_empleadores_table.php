<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empleadores', function (Blueprint $table) {
            $table->string('correo', 180)->nullable()->after('tipo');
        });
    }

    public function down(): void
    {
        Schema::table('empleadores', function (Blueprint $table) {
            $table->dropColumn('correo');
        });
    }
};
