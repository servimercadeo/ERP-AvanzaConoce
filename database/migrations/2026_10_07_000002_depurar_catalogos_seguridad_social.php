<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Deja los catálogos de seguridad social (EPS, ARL, cajas de compensación, fondos de
 * pensiones y de cesantías) iguales a las listas depuradas por Talento Humano
 * (2026-10-07): agrega los que faltan, quita duplicados y los que no están en la lista.
 *
 * Empleados, contratos, candidatos y respuestas de ingreso guardan el NOMBRE (no el id),
 * así que antes de tocar el catálogo se corrigen esos registros:
 *  - variantes del mismo nombre (mayúsculas, espacios) → nombre exacto de la lista;
 *  - equivalencias explícitas (RENOMBRAR), p. ej. "FONDO NACIONAL DEL AHORRO" → "FNA".
 * Un valor que se quita del catálogo sin equivalencia se deja intacto en los registros
 * (se sigue mostrando tal cual): cambiarlo sería inventar el dato.
 *
 * Idempotente: correrla dos veces no cambia nada. Los ids de estos catálogos no son
 * autoincrementales, por eso al insertar se calcula max(id) + 1.
 */
return new class extends Migration
{
    private const CATALOGOS = [
        'eps' => [
            'lista' => [
                'SURA EPS', 'SALUD TOTAL EPS', 'SANITAS EPS', 'S.O.S. EPS', 'NUEVA E.P.S',
                'CAJA COPI', 'SALUD MIA E.P.S', 'FAMISANAR EPS', 'COMPENSAR', 'CAPITAL SALUD',
                'PIJAOS SALUD EPSI', 'COOSALUD EPS', 'MUTUAL SER', 'COOLSALUD', 'ALIANSALUD',
                'SALUD VIDA EPS', 'COMFAORIENTE', 'ASMET SALUD', 'EMSSANAR E.P.S',
                'COMFENALCO VALLE EPS', 'SAVIA SALUD', 'A.I.C.', 'EPS FAMILIAR DE COLOMBIA',
                'EPS DUSAKAWI', 'MUTUAL SALUD', 'N/A', 'IESS', 'COOMEVA EPS', 'SISBEN',
                'MALLAMAS EPSI -CM', 'BARRIOS UNIDOS', 'COMPARTA', 'CONFAMA', 'FOSYGA',
                'SALUDCOOP', 'MEDIMAS E.P.S', 'AMBUQ ESS', 'SANIDAD MILITAR', 'CRUZ BLANCA EPS',
                'CAPRECOM', 'COMFACOR', 'ASOCIACION BARRIOS UNIDOS DE QUIBDO E.S.S. AMBUQ',
                'EPS CAJA DE COMPENSACION FLIAR DE NARIÑO', 'EMDISALUD', 'MEDIMAS E.P.S. MOVILIDAD',
            ],
            'renombrar' => [
                'EMDISALUD E.S.S.' => 'EMDISALUD',
                'COOPERATIVA DE SALUD COMUNITARIA COMPARTA' => 'COMPARTA',
            ],
            'columnas' => [['users', 'eps'], ['contratos', 'lps_afiliado'], ['respuestas_ingresos', 'eps']],
        ],
        'arls' => [
            'lista' => [
                'SEGUROS BOLIVAR', 'AXA COLPATRIA', 'SANITAS', 'SURA', 'N/A', 'IESS', 'POSITIVA', 'COLMENA',
            ],
            'renombrar' => [
                'NO APORTA' => 'N/A',
            ],
            'columnas' => [['users', 'arl'], ['contratos', 'arl'], ['candidatos', 'arl']],
        ],
        'cajas_compensacion' => [
            'lista' => [
                'COMFAMA', 'COMFAMILIARES CALDAS', 'COMBARRANQUILLA', 'COMFAMILIAR ATLANTICO',
                'COMFAMILIAR RISARALDA', 'CONFA', 'COMFANDI', 'COMPENSAR', 'COMFENALCO SANTANDER',
                'COMFENALCO CARTAGENA', 'COMFAMILIAR CARTAGENA', 'COMFACOR', 'COMFASUCRE',
                'COMFAORIENTE', 'COMFACESAR', 'COMFANORTE', 'CONFAMA', 'N/A', 'COMFENALCO',
                'COMFAMILIAR NARIÑO', 'CONFENALCO VALLE', 'CONFENALCO ANTIOQUIA', 'COMFENALCO QUINDIO',
                'CAFAM', 'IESS', 'CAFABA', 'COMFACAUCA', 'COLSUBSIDIO', 'COMFAMILIAR BOLIVAR',
                'COMFAGUAJIRA', 'COFREM', 'COMFABOY', 'CAJAMAG', 'COMFENALCO TOLIMA',
            ],
            'renombrar' => [
                'SIN CAJA DE COMPENSACION' => 'N/A',
            ],
            'columnas' => [['users', 'caja_compensacion'], ['contratos', 'caja_compensacion'], ['candidatos', 'caja_compensacion']],
        ],
        'fondos_pensiones' => [
            'lista' => [
                'PORVENIR', 'PROTECCION', 'COLFONDOS', 'OLD MUTUAL', 'COLPENSIONES', 'PENSIONADO',
                'N/A', 'SKANDIA OLD MUTUAL', 'NO TIENE', 'IESS', 'ISS', 'FUERZAS MILITARES',
            ],
            'renombrar' => [],
            'columnas' => [['users', 'fondo_pensiones'], ['contratos', 'fondo_pensiones'], ['respuestas_ingresos', 'afp']],
        ],
        'fondos_cesantias' => [
            'lista' => [
                'PROTECCION', 'Porvenir', 'N/A', 'COLPENSIONES', 'FNA', 'IESS', 'Colfondos',
            ],
            'renombrar' => [
                'FONDO NACIONAL DEL AHORRO' => 'FNA',
            ],
            'columnas' => [['contratos', 'fondo_cesantias']],
        ],
    ];

    public function up(): void
    {
        foreach (self::CATALOGOS as $tabla => $cfg) {
            if (!Schema::hasTable($tabla)) {
                continue;
            }

            // clave normalizada → nombre exacto de la lista
            $canon = [];
            foreach ($cfg['lista'] as $nombre) {
                $canon[$this->clave($nombre)] = $nombre;
            }
            foreach ($cfg['renombrar'] as $viejo => $nuevo) {
                $canon[$this->clave($viejo)] = $nuevo;
            }

            DB::transaction(function () use ($tabla, $cfg, $canon) {
                $this->corregirRegistros($cfg['columnas'], $canon);
                $this->sincronizarCatalogo($tabla, $cfg['lista']);
            });
        }
    }

    public function down(): void
    {
        // Sin vuelta atrás: los nombres quitados no se pueden reconstruir con certeza.
    }

    private function clave(?string $nombre): string
    {
        return mb_strtoupper(preg_replace('/\s+/u', ' ', trim((string) $nombre)), 'UTF-8');
    }

    /** Pasa cada valor distinto de las columnas a su nombre de la lista, si lo tiene. */
    private function corregirRegistros(array $columnas, array $canon): void
    {
        foreach ($columnas as [$tabla, $columna]) {
            if (!Schema::hasTable($tabla) || !Schema::hasColumn($tabla, $columna)) {
                continue;
            }
            $valores = DB::table($tabla)->whereNotNull($columna)->where($columna, '!=', '')
                ->distinct()->pluck($columna);

            foreach ($valores as $valor) {
                $nuevo = $canon[$this->clave($valor)] ?? null;
                if ($nuevo !== null && $nuevo !== $valor) {
                    // BINARY: comparar exacto (con collation ci, "Porvenir" = "PORVENIR").
                    DB::table($tabla)->whereRaw("BINARY `$columna` = ?", [$valor])
                        ->update([$columna => $nuevo]);
                }
            }
        }
    }

    /** Deja el catálogo con exactamente los nombres de la lista, una vez cada uno. */
    private function sincronizarCatalogo(string $tabla, array $lista): void
    {
        $quedan = [];
        foreach (DB::table($tabla)->orderBy('id')->get(['id', 'nombre']) as $fila) {
            $clave = $this->clave($fila->nombre);
            $nombre = null;
            foreach ($lista as $n) {
                if ($this->clave($n) === $clave) {
                    $nombre = $n;
                    break;
                }
            }

            if ($nombre === null || isset($quedan[$clave])) {
                // No está en la lista, o es un duplicado de uno que ya se conservó.
                DB::table($tabla)->where('id', $fila->id)->delete();
                continue;
            }
            $quedan[$clave] = true;
            if ($fila->nombre !== $nombre) {
                DB::table($tabla)->where('id', $fila->id)->update(['nombre' => $nombre, 'updated_at' => now()]);
            }
        }

        $id = (int) DB::table($tabla)->max('id');
        foreach ($lista as $nombre) {
            if (!isset($quedan[$this->clave($nombre)])) {
                DB::table($tabla)->insert([
                    'id' => ++$id, 'nombre' => $nombre, 'created_at' => now(), 'updated_at' => now(),
                ]);
                $quedan[$this->clave($nombre)] = true;
            }
        }
    }
};
