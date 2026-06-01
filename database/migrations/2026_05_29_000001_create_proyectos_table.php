<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proyectos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        DB::table('proyectos')->insert([
            ['nombre' => 'TIGO TROPAS',      'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'TIGO HOME',         'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'TIGO EXPRESS',      'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'DIRECTV CO',        'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'DIRECTV ECU',       'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'SOLO AUSENTISMOS',  'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'BANCOLDEX',         'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'HUGHES COL',        'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'HUGHES ECU',        'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'C&C',               'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'FT&H',              'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'S&M ASESORES',      'activo' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('proyectos');
    }
};
