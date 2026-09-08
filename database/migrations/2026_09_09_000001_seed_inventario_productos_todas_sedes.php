<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * La seed original (2026_09_03_000002) solo cargó 12 sedes de muestra. El
     * catálogo real tiene muchas más y todas deben mostrar stock (nunca 0) para
     * cada producto de las 5 categorías con inventario real (Dotación queda
     * fuera: tiene su propio inventario en inventario_dotacion). Esta migración
     * completa únicamente las combinaciones tipo_producto/sede que todavía no
     * existen, sin tocar el stock ya cargado.
     */
    public function up(): void
    {
        $tipos = DB::table('tipos_producto')
            ->where('categoria', '!=', 'Dotación')
            ->get(['id', 'nombre']);

        if ($tipos->isEmpty()) {
            return;
        }

        $sedeIds = DB::table('sedes')->pluck('id')->all();
        if (empty($sedeIds)) {
            return;
        }

        $existentes = DB::table('inventario_productos')
            ->get(['tipo_producto_id', 'sede_id'])
            ->map(fn ($r) => $r->tipo_producto_id . ':' . $r->sede_id)
            ->flip();

        $now = now();
        $rows = [];

        foreach ($tipos as $tipo) {
            $precioBase = 15000 + (crc32($tipo->nombre) % 480000);

            foreach ($sedeIds as $sedeId) {
                if (isset($existentes[$tipo->id . ':' . $sedeId])) {
                    continue;
                }

                $stockMinimo = random_int(5, 20);
                $cantidad = random_int($stockMinimo + 1, $stockMinimo * 3);

                $rows[] = [
                    'tipo_producto_id' => $tipo->id,
                    'sede_id'          => $sedeId,
                    'precio'           => $precioBase,
                    'cantidad'         => $cantidad,
                    'stock_minimo'     => $stockMinimo,
                    'created_at'       => $now,
                    'updated_at'       => $now,
                ];
            }
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('inventario_productos')->insert($chunk);
        }
    }

    public function down(): void
    {
        // No se puede distinguir de forma segura lo que agregó esta migración de lo
        // que ya existía antes, así que no se revierte automáticamente.
    }
};
