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
        DB::statement("ALTER TABLE users MODIFY rol ENUM('admin', 'gestor', 'consultor', 'th', 'tic') NOT NULL DEFAULT 'consultor'");

        // Backfill: deriva el rol a partir del cargo para los usuarios ya existentes.
        DB::table('users')->where('cargo', 'like', '%TALENTO HUMANO%')->update(['rol' => 'th']);
        DB::table('users')
            ->where(function ($q) {
                $q->where('cargo', 'like', '%SISTEMAS%')->orWhere('cargo', 'like', '%TIC%');
            })
            ->update(['rol' => 'tic']);

        // Admin único del ERP.
        DB::table('users')->where('email', 'marin.jc2005@gmail.com')->update(['rol' => 'admin']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('users')->whereIn('rol', ['th', 'tic'])->update(['rol' => 'consultor']);
        DB::statement("ALTER TABLE users MODIFY rol ENUM('admin', 'gestor', 'consultor') NOT NULL DEFAULT 'consultor'");
    }
};
