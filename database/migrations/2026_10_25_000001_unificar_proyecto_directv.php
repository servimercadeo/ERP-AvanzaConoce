<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El proyecto DIRECTV se llamaba "DIRECTV CO" en local y "DIRECTV COL" en producción, y el
     * código solo reconocía el primero (regla empresa-proyecto, dotación, rol en AvanzaConoce).
     * El país ya es un dato aparte: el proyecto se llama solo "DIRECTV" en todo el sistema.
     * Si existen varios, se fusionan en el de menor id. Se puede correr más de una vez.
     */
    private const NOMBRES_VIEJOS = ['DIRECTV CO', 'DIRECTV COL'];
    private const NOMBRE = 'DIRECTV';

    /** Columnas que guardan el proyecto por nombre. */
    private const COLUMNAS_TEXTO = [
        'contratos'               => 'cliente_proyecto',
        'base_ingresos'           => 'proyecto',
        'pedidos_globales'        => 'cliente_proyecto',
        'centros_costo_catalogo'  => 'proyecto',
    ];

    public function up(): void
    {
        $nombres = array_merge(self::NOMBRES_VIEJOS, [self::NOMBRE]);
        $ids = DB::table('proyectos')
            ->whereIn(DB::raw('UPPER(TRIM(nombre))'), $nombres)
            ->orderBy('id')->pluck('id')->all();

        DB::transaction(function () use ($ids) {
            if ($ids) {
                $id = array_shift($ids);
                DB::table('proyectos')->where('id', $id)->update(['nombre' => self::NOMBRE, 'updated_at' => now()]);
                foreach ($ids as $duplicado) {
                    $this->fusionar($duplicado, $id);
                }
            }

            foreach (self::COLUMNAS_TEXTO as $tabla => $columna) {
                if (Schema::hasColumn($tabla, $columna)) {
                    DB::table($tabla)->whereIn(DB::raw("UPPER(TRIM({$columna}))"), self::NOMBRES_VIEJOS)
                        ->update([$columna => self::NOMBRE]);
                }
            }
        });
    }

    /** Pasa todo lo del proyecto duplicado al que se conserva y borra el duplicado. */
    private function fusionar(int $duplicado, int $id): void
    {
        DB::table('requisiciones')->where('proyecto_id', $duplicado)->update(['proyecto_id' => $id]);
        DB::table('sedes')->where('proyecto_id', $duplicado)->update(['proyecto_id' => $id]);

        // proyecto_sede es única por (proyecto, sede): solo se pasan las sedes que aún no tiene.
        $yaTiene = DB::table('proyecto_sede')->where('proyecto_id', $id)->pluck('sede_id')->all();
        DB::table('proyecto_sede')->where('proyecto_id', $duplicado)->whereNotIn('sede_id', $yaTiene)->update(['proyecto_id' => $id]);
        DB::table('proyecto_sede')->where('proyecto_id', $duplicado)->delete();

        // Un cronograma por proyecto: se conserva el del proyecto que queda, si ya tiene uno.
        if (DB::table('cronograma_dotacion')->where('proyecto_id', $id)->exists()) {
            DB::table('cronograma_dotacion')->where('proyecto_id', $duplicado)->delete();
        } else {
            DB::table('cronograma_dotacion')->where('proyecto_id', $duplicado)->update(['proyecto_id' => $id]);
        }

        DB::table('proyectos')->where('id', $duplicado)->delete();
    }

    public function down(): void
    {
        // Sin vuelta atrás: no se sabe cuál de los nombres anteriores tenía cada registro.
    }
};
