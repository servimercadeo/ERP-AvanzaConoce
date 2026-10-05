<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Validaciones campo por campo compartidas por las importaciones desde Excel de Empleados
 * (EmpleadoController@importarDatosPersonales) y Contratos
 * (ContratoController@importarDatosFaltantes). Cada método devuelve el valor ya
 * normalizado, o null si no es válido (la celda se reporta como inválida y se omite).
 */
class ImportacionExcelValidador
{
    /**
     * "aaaa-mm-dd" de una fecha que existe de verdad. Sin checkdate(), una fecha como
     * 1990-02-31 la acepta el cast `date` de Eloquent desbordándola a 1990-03-03: se
     * guardaría una fecha distinta a la del archivo sin que nadie lo note.
     */
    public static function fecha(mixed $valor, int $anioMinimo, int $anioMaximo): ?string
    {
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', (string) $valor, $m)) {
            return null;
        }
        [, $anio, $mes, $dia] = array_map('intval', $m);
        if ($anio < $anioMinimo || $anio > $anioMaximo || !checkdate($mes, $dia, $anio)) {
            return null;
        }

        return (string) $valor;
    }

    public static function correo(mixed $valor): ?string
    {
        $correo = mb_strtolower(trim((string) $valor), 'UTF-8');

        return filter_var($correo, FILTER_VALIDATE_EMAIL) ? $correo : null;
    }

    /** Nombre oficial de la sede en el catálogo `sedes` (sin importar mayúsculas), o null si no existe. */
    public static function sede(mixed $valor): ?string
    {
        $nombre = trim((string) $valor);
        if ($nombre === '') {
            return null;
        }

        return DB::table('sedes')
            ->whereRaw('UPPER(TRIM(nombre)) = ?', [mb_strtoupper($nombre, 'UTF-8')])
            ->value('nombre');
    }
}
