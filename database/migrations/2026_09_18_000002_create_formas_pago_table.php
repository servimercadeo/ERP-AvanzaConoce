<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formas_pago', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100)->unique();
            $table->timestamps();
        });

        DB::table('formas_pago')->insert([
            ['nombre' => 'Contado', 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'Crédito 30 días', 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'Crédito 60 días', 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'Crédito 90 días', 'created_at' => now(), 'updated_at' => now()],
            ['nombre' => 'Transferencia Bancaria', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('formas_pago');
    }
};
