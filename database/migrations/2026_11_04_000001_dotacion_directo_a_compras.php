<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * La dotación ya no pasa por la pantalla de Pedidos: "Enviar a compras" la lleva directo a
     * Compras. Los pedidos que estaban en ese estado esperando el check de Pedidos pasan a
     * Compras para no quedar sin pantalla donde verlos.
     */
    public function up(): void
    {
        DB::table('pedidos_automaticos')
            ->where('estado', 'Enviar a compras')
            ->where('recibido_pedidos', false)
            ->update(['recibido_pedidos' => true, 'estado_compra' => 'Cotizando']);
    }

    /** No se revierte: ya no se sabe cuáles esperaban el check. */
    public function down(): void
    {
    }
};
