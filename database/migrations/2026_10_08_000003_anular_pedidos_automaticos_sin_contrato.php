<?php

use App\Models\PedidoAutomatico;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Pedidos de dotación que quedaron sin contrato (contrato o empleado borrado antes de
     * que esto se hiciera solo): se anulan, devolviendo las prendas al inventario, y se
     * eliminan. Los ya entregados se conservan (ver PedidoAutomatico::anularSinContrato).
     */
    public function up(): void
    {
        $eliminados = PedidoAutomatico::anularSinContrato();
        Log::info("Migración: {$eliminados} pedidos automáticos sin contrato anulados y eliminados.");
    }

    public function down(): void
    {
        // No se revierte: los pedidos eliminados no tenían contrato.
    }
};
