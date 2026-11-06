<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Parámetros > Operativos: supervisor por técnico y torre por sede, solo para el exporte de Work Orders (no cambian rol ni cargo).
    public function up(): void
    {
        if (!Schema::hasTable('supervisores')) {
            Schema::create('supervisores', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
                $table->timestamps();
            });
        }
        if (!Schema::hasTable('supervisor_tecnico')) {
            Schema::create('supervisor_tecnico', function (Blueprint $table) {
                $table->id();
                $table->foreignId('supervisor_id')->constrained('supervisores')->cascadeOnDelete();
                $table->foreignId('tecnico_id')->unique()->constrained('users')->cascadeOnDelete();
                $table->timestamps();
            });
        }
        if (!Schema::hasTable('torres')) {
            Schema::create('torres', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
                $table->timestamps();
            });
        }
        if (!Schema::hasTable('torre_sede')) {
            Schema::create('torre_sede', function (Blueprint $table) {
                $table->id();
                $table->foreignId('torre_id')->constrained('torres')->cascadeOnDelete();
                $table->foreignId('sede_id')->unique()->constrained('sedes')->cascadeOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('torre_sede');
        Schema::dropIfExists('torres');
        Schema::dropIfExists('supervisor_tecnico');
        Schema::dropIfExists('supervisores');
    }
};
