<?php

namespace App\Services;

/**
 * Convierte un valor entero de pesos colombianos a su escritura en letras
 * (ej. 720426 -> "SETECIENTOS VEINTE MIL CUATROCIENTOS VEINTISEIS PESOS"), para el
 * campo "Valor total en letras" de la Orden de Compra impresa.
 */
class NumeroALetrasService
{
    private const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    private const ESPECIALES = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    private const DECENAS = [2 => 'VEINTE', 3 => 'TREINTA', 4 => 'CUARENTA', 5 => 'CINCUENTA', 6 => 'SESENTA', 7 => 'SETENTA', 8 => 'OCHENTA', 9 => 'NOVENTA'];
    private const CENTENAS = [1 => 'CIENTO', 2 => 'DOSCIENTOS', 3 => 'TRESCIENTOS', 4 => 'CUATROCIENTOS', 5 => 'QUINIENTOS', 6 => 'SEISCIENTOS', 7 => 'SETECIENTOS', 8 => 'OCHOCIENTOS', 9 => 'NOVECIENTOS'];

    public static function pesos(int $valor): string
    {
        $valor = max(0, $valor);
        $palabras = $valor === 0 ? 'CERO' : self::conUn(self::convertir($valor));

        return "{$palabras} PESOS";
    }

    private static function convertir(int $n): string
    {
        if ($n < 1000) {
            return self::grupo($n);
        }

        $millones = intdiv($n, 1000000);
        $resto1 = $n % 1000000;
        $miles = intdiv($resto1, 1000);
        $resto2 = $resto1 % 1000;

        $partes = [];

        if ($millones > 0) {
            $partes[] = $millones === 1
                ? 'UN MILLON'
                : self::conUn(self::grupo($millones)) . ' MILLONES';
        }

        if ($miles > 0) {
            $partes[] = $miles === 1
                ? 'MIL'
                : self::conUn(self::grupo($miles)) . ' MIL';
        }

        if ($resto2 > 0 || empty($partes)) {
            $partes[] = self::grupo($resto2);
        }

        return implode(' ', $partes);
    }

    private static function grupo(int $n): string
    {
        if ($n === 0) {
            return '';
        }
        if ($n === 100) {
            return 'CIEN';
        }

        $centenas = intdiv($n, 100);
        $resto = $n % 100;

        $texto = $centenas > 0 ? self::CENTENAS[$centenas] : '';

        if ($resto > 0) {
            $texto .= ($texto !== '' ? ' ' : '') . self::decenas($resto);
        }

        return $texto;
    }

    private static function decenas(int $n): string
    {
        if ($n < 10) {
            return self::UNIDADES[$n];
        }
        if ($n < 20) {
            return self::ESPECIALES[$n - 10];
        }
        if ($n === 20) {
            return 'VEINTE';
        }
        if ($n < 30) {
            return 'VEINTI' . self::UNIDADES[$n - 20];
        }

        $decena = intdiv($n, 10);
        $unidad = $n % 10;

        return $unidad === 0
            ? self::DECENAS[$decena]
            : self::DECENAS[$decena] . ' Y ' . self::UNIDADES[$unidad];
    }

    private static function conUn(string $palabras): string
    {
        return preg_replace('/UNO$/', 'UN', $palabras);
    }
}
