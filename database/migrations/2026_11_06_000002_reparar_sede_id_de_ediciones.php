<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Al editar la sede de un contrato, empleado o pedido se guardaba el nombre nuevo pero `sede_id`
 * se quedaba en la sede anterior (ver HasSedeCatalogo), y la pantalla seguía mostrando la vieja.
 * Se corrige solo cuando el texto es exactamente el nombre de OTRA sede: si no coincide con
 * ninguna, es una sede renombrada (el id ya es el correcto) o texto libre, y no se toca.
 */
return new class extends Migration
{
    public function up(): void
    {
        $sedes = DB::table('sedes')->pluck('id', 'nombre')
            ->mapWithKeys(fn ($id, $nombre) => [mb_strtoupper(trim($nombre), 'UTF-8') => $id]);
        $nombrePorId = DB::table('sedes')->pluck('nombre', 'id')
            ->map(fn ($nombre) => mb_strtoupper(trim($nombre), 'UTF-8'));

        foreach (['contratos', 'users', 'pedidos_compra'] as $tabla) {
            DB::table($tabla)->whereNotNull('sede_id')->where('sede', '!=', '')->orderBy('id')
                ->select('id', 'sede', 'sede_id')
                ->chunkById(500, function ($filas) use ($tabla, $sedes, $nombrePorId) {
                    foreach ($filas as $fila) {
                        $texto = mb_strtoupper(trim((string) $fila->sede), 'UTF-8');
                        $correcto = $sedes->get($texto);
                        if ($correcto && $correcto !== (int) $fila->sede_id && $nombrePorId->get($fila->sede_id) !== $texto) {
                            DB::table($tabla)->where('id', $fila->id)->update(['sede_id' => $correcto]);
                        }
                    }
                });
        }
    }

    public function down(): void
    {
        // No se revierte: los ids viejos eran el error.
    }
};
