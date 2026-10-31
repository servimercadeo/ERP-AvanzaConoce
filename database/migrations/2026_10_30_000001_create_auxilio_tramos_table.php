<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Auxilio por productividad (Operaciones > Auxilios): a los técnicos directos se les
     * paga cada Work Order que finalizan en el mes según la cantidad TOTAL que hicieron ese
     * mes (todas al mismo valor del tramo que alcanzaron, no progresivo). Las escalas quedan
     * editables desde la propia pantalla porque son tarifas de pago, no un catálogo fijo.
     */
    public function up(): void
    {
        Schema::create('auxilio_tramos', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('desde');
            $table->unsignedInteger('hasta')->nullable(); // null = sin límite superior
            $table->unsignedInteger('valor_por_orden');
            $table->timestamps();
        });

        $now = now();
        DB::table('auxilio_tramos')->insert([
            ['desde' => 0,   'hasta' => 100,  'valor_por_orden' => 4000, 'created_at' => $now, 'updated_at' => $now],
            ['desde' => 101, 'hasta' => 105,  'valor_por_orden' => 4300, 'created_at' => $now, 'updated_at' => $now],
            ['desde' => 106, 'hasta' => 120,  'valor_por_orden' => 4400, 'created_at' => $now, 'updated_at' => $now],
            ['desde' => 121, 'hasta' => null, 'valor_por_orden' => 5000, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('auxilio_tramos');
    }
};
