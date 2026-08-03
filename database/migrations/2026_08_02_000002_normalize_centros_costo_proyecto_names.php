<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * La migración anterior (2026_08_02_000001) cargó `proyecto` con los nombres
     * tal como aparecían en el Excel de origen ("Hughes Net", "Tigo express PDV",
     * "Tigo FDV Home", "Administración"), que no coinciden con los nombres reales
     * ya existentes en la tabla `proyectos` usada en el resto del sistema. Este
     * paso los normaliza a esos nombres existentes.
     */
    private const MAPEO = [
        'Hughes Net'        => 'HUGHES COL',
        'Tigo express PDV'  => 'TIGO EXPRESS',
        'Tigo FDV Home'     => 'TIGO HOME',
        'Administración'    => 'ADMINISTRACION',
    ];

    public function up(): void
    {
        foreach (self::MAPEO as $viejo => $nuevo) {
            DB::table('centros_costo_catalogo')->where('proyecto', $viejo)->update(['proyecto' => $nuevo]);
        }
    }

    public function down(): void
    {
        foreach (self::MAPEO as $viejo => $nuevo) {
            DB::table('centros_costo_catalogo')->where('proyecto', $nuevo)->update(['proyecto' => $viejo]);
        }
    }
};
