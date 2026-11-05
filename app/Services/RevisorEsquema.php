<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Compara la estructura real de la base con la que dejan las migraciones. En producción hay
 * tablas creadas a mano, y una diferencia (columna faltante, otro juego de caracteres) solo se
 * nota como un "Server Error" cuando alguien usa esa pantalla. Solo lee.
 */
class RevisorEsquema
{
    public const ARCHIVO = 'database/esquema_esperado.json';

    /**
     * La estructura actual, sin el prefijo de las tablas:
     * [tabla => [columna => ['tipo' => ..., 'nulo' => bool, 'por_defecto' => bool, 'charset' => ?string]]]
     */
    public static function leerActual(): array
    {
        $prefijo = DB::getTablePrefix();
        $filas = DB::select(
            'select c.table_name as tabla, c.column_name as columna, c.column_type as tipo, c.is_nullable as nulo,
                    c.column_default as por_defecto, c.extra as extra, c.character_set_name as charset
             from information_schema.columns c
             join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
             where c.table_schema = database() and t.table_type = ?',
            ['BASE TABLE'],
        );

        $esquema = [];
        foreach ($filas as $f) {
            if ($prefijo !== '' && !str_starts_with($f->tabla, $prefijo)) {
                continue; // Otro sistema en la misma base (geoproyect).
            }
            $esquema[substr($f->tabla, strlen($prefijo))][$f->columna] = [
                'tipo'        => self::normalizarTipo($f->tipo),
                'nulo'        => $f->nulo === 'YES',
                'por_defecto' => $f->por_defecto !== null || str_contains((string) $f->extra, 'auto_increment'),
                'charset'     => $f->charset,
            ];
        }
        ksort($esquema);

        return $esquema;
    }

    /** MySQL 8 no muestra el ancho de los enteros y MariaDB guarda JSON como longtext. */
    public static function normalizarTipo(string $tipo): string
    {
        $tipo = strtolower(trim($tipo));
        $tipo = preg_replace('/\b(bigint|mediumint|smallint|tinyint|int)\(\d+\)/', '$1', $tipo);

        return $tipo === 'json' ? 'longtext' : $tipo;
    }

    /**
     * @return array{errores: string[], avisos: string[]} errores: pueden causar un fallo al usar
     * el sistema. avisos: conviene revisarlos, pero no impiden trabajar por sí solos.
     */
    public static function comparar(array $esperado, array $actual): array
    {
        $errores = [];
        $avisos = [];

        foreach ($esperado as $tabla => $columnas) {
            if (!isset($actual[$tabla])) {
                $errores[] = "Falta la tabla {$tabla}.";
                continue;
            }

            foreach ($columnas as $columna => $espera) {
                $hay = $actual[$tabla][$columna] ?? null;
                if (!$hay) {
                    $errores[] = "{$tabla}.{$columna}: falta la columna.";
                    continue;
                }
                if (($error = self::tipoIncompatible($espera['tipo'], $hay['tipo'])) !== null) {
                    $errores[] = "{$tabla}.{$columna}: {$error}";
                }
                if ($espera['nulo'] && !$hay['nulo'] && !$hay['por_defecto']) {
                    $errores[] = "{$tabla}.{$columna}: debería aceptar vacío y es obligatoria sin valor por defecto.";
                }
                if ($hay['charset'] && !str_starts_with($hay['charset'], 'utf8mb4')) {
                    $avisos[] = "{$tabla}.{$columna}: usa {$hay['charset']}; símbolos como \"→\" o emojis fallan al guardar.";
                }
            }

            foreach (array_diff_key($actual[$tabla], $columnas) as $columna => $hay) {
                if (!$hay['nulo'] && !$hay['por_defecto']) {
                    $errores[] = "{$tabla}.{$columna}: columna que el sistema no conoce, obligatoria y sin valor por defecto: los registros nuevos fallan.";
                }
            }
        }

        return ['errores' => $errores, 'avisos' => $avisos];
    }

    /** Null si son compatibles. Una columna de texto más larga que la esperada no es problema. */
    private static function tipoIncompatible(string $espera, string $hay): ?string
    {
        if ($espera === $hay) {
            return null;
        }

        $largo = fn (string $t) => preg_match('/^(var)?char\((\d+)\)$/', $t, $m) ? (int) $m[2] : null;
        if ($largo($espera) !== null && $largo($hay) !== null) {
            return $largo($hay) >= $largo($espera) ? null : "tiene {$hay} y necesita {$espera}: los textos largos fallan al guardar.";
        }

        $esTexto = fn (string $t) => in_array($t, ['tinytext', 'text', 'mediumtext', 'longtext'], true);
        $orden = ['tinytext' => 0, 'text' => 1, 'mediumtext' => 2, 'longtext' => 3];
        if ($esTexto($espera) && $esTexto($hay)) {
            return $orden[$hay] >= $orden[$espera] ? null : "tiene {$hay} y necesita {$espera}.";
        }

        return "tiene {$hay} y necesita {$espera}.";
    }
}
