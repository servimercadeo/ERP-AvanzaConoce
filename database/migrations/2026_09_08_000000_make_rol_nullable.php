<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Permite dejar el rol en NULL cuando el cargo no coincide con ningún
        // patrón conocido (TH/TIC) — hoy no existe otro rol derivado de cargo.
        DB::statement("ALTER TABLE users MODIFY rol ENUM('admin', 'gestor', 'consultor', 'th', 'tic') NULL DEFAULT 'consultor'");

        // Normaliza las cadenas vacías que ya existían en la data importada.
        DB::table('users')->where('rol', '')->update(['rol' => null]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('users')->whereNull('rol')->update(['rol' => 'consultor']);
        DB::statement("ALTER TABLE users MODIFY rol ENUM('admin', 'gestor', 'consultor', 'th', 'tic') NOT NULL DEFAULT 'consultor'");
    }
};
