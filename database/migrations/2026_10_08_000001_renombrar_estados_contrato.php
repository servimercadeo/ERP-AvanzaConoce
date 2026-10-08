<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Nuevos estados de contrato: Vigente, Finalizado, Traslado y Finalizado traslado
     * ("No ingreso" y "Contrato anulado" se conservan por su lógica propia).
     */
    private const MAPA = [
        'Activo'    => 'Vigente',
        'Inactivo'  => 'Finalizado',
        'Cancelado' => 'Finalizado',
    ];

    public function up(): void
    {
        foreach (['contratos', 'dotaciones'] as $tabla) {
            if (!Schema::hasTable($tabla)) {
                continue;
            }
            foreach (self::MAPA as $viejo => $nuevo) {
                DB::table($tabla)->where('estado_contrato', $viejo)->update(['estado_contrato' => $nuevo]);
            }
        }
    }

    public function down(): void
    {
        foreach (['contratos', 'dotaciones'] as $tabla) {
            if (!Schema::hasTable($tabla)) {
                continue;
            }
            DB::table($tabla)->where('estado_contrato', 'Vigente')->update(['estado_contrato' => 'Activo']);
            DB::table($tabla)->where('estado_contrato', 'Finalizado')->update(['estado_contrato' => 'Inactivo']);
        }
    }
};
