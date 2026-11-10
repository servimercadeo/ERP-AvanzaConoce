<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Escala del AUXILIAR directo que acompaña al técnico (ver WorkOrderController::update,
     * modo ACOMPAÑADO). No aplica a aliados: solo se registra el acompañante de un directo.
     * Las primeras 20 órdenes del mes no se pagan; de ahí en adelante sube por tramos.
     */
    private const TRAMOS = [
        ['desde' => 0,  'hasta' => 20,   'valor_por_orden' => 0],
        ['desde' => 21, 'hasta' => 30,   'valor_por_orden' => 3500],
        ['desde' => 31, 'hasta' => 40,   'valor_por_orden' => 4000],
        ['desde' => 41, 'hasta' => null, 'valor_por_orden' => 4500],
    ];

    public function up(): void
    {
        if (DB::table('auxilio_tramos')->where('tipo', 'auxiliar')->exists()) {
            return;
        }

        $now = now();
        DB::table('auxilio_tramos')->insert(array_map(
            fn (array $tramo) => $tramo + ['tipo' => 'auxiliar', 'created_at' => $now, 'updated_at' => $now],
            self::TRAMOS,
        ));
    }

    public function down(): void
    {
        DB::table('auxilio_tramos')->where('tipo', 'auxiliar')->delete();
    }
};
