<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sedes', function (Blueprint $table) {
            $table->string('tipo_sede', 50)->default('Principal')->change();
        });
    }

    public function down(): void
    {
        Schema::table('sedes', function (Blueprint $table) {
            $table->string('tipo_sede', 20)->default('Principal')->change();
        });
    }
};
