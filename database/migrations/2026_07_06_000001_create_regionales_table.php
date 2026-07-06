<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('regionales', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100)->unique();
            $table->string('descripcion', 255)->nullable();
            $table->timestamps();
        });

        DB::table('regionales')->insert([
            [
                'nombre'      => 'EJE CAFETERO',
                'descripcion' => 'Eje cafetero y las tiendas de Valle del Cauca',
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'nombre'      => 'ANDINA',
                'descripcion' => 'Toda la parte de Antioquia',
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'nombre'      => 'CENTRO',
                'descripcion' => 'Bogotá y Cundinamarca',
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'nombre'      => 'ORIENTE',
                'descripcion' => 'Santander y Norte de Santander',
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'nombre'      => 'COSTA',
                'descripcion' => 'Restante de Bolívar, Atlántico, Sucre, Montería y demás zona sur del país',
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('regionales');
    }
};
