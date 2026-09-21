<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Tipos de producto de las 5 categorías nuevas (Dotación ya tiene su propio
        // inventario real en inventario_dotacion, así que se excluye aquí).
        $tipos = DB::table('tipos_producto')
            ->where('categoria', '!=', 'Dotación')
            ->get(['id', 'nombre']);

        if ($tipos->isEmpty()) {
            return;
        }

        // 12 sedes reales repartidas por todo el rango de ids, para tener variedad
        // geográfica sin tener que cargar las 91 sedes para cada producto.
        $sedeIds = DB::table('sedes')->orderBy('id')->pluck('id')->all();
        if (empty($sedeIds)) {
            return;
        }

        $totalSedes = count($sedeIds);
        $cantidadSedes = min(12, $totalSedes);
        $paso = max(1, intdiv($totalSedes, $cantidadSedes));
        $sedesElegidas = [];
        for ($i = 0; $i < $totalSedes && count($sedesElegidas) < $cantidadSedes; $i += $paso) {
            $sedesElegidas[] = $sedeIds[$i];
        }

        $now = now();
        $rows = [];

        foreach ($tipos as $tipo) {
            // Precio base estable por producto (no aleatorio en cada fila), variando
            // por el nombre para que no todos los productos cuesten lo mismo.
            $precioBase = 15000 + (crc32($tipo->nombre) % 480000);

            foreach ($sedesElegidas as $sedeId) {
                $stockMinimo = random_int(5, 20);
                // Nunca 0: mínimo 1 unidad por encima del mínimo, hasta el triple.
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
        DB::table('inventario_productos')->truncate();
    }
};
