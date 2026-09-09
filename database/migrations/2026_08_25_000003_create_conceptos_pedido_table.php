<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conceptos_pedido', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150)->unique();
            $table->string('descripcion', 255)->nullable();
            $table->timestamps();
        });

        // Valores ya en uso hoy en Pedidos y Compras > Ver y Crear Pedidos.
        DB::table('conceptos_pedido')->insert([
            ['nombre' => 'DAÑO', 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'NUEVO ITEM', 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'OPTIMIZACION', 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'PERDIDA', 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'REPOSICION', 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'ROBO', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('conceptos_pedido');
    }
};
