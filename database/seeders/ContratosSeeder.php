<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ContratosSeeder extends Seeder
{
    private const TIPO_CONTRATO = [
        1 => 'Por definir',
        2 => 'Término Fijo',
        3 => 'Término Fijo Inferior a un año',
        4 => 'De Obra Labor',
        5 => 'Aprendiz SENA',
        6 => 'Término Indefinido',
        7 => 'Indefinido Medio Tiempo',
    ];

    private const TIPO_VINCULACION = [
        1 => 'Directo',
        2 => 'Indirecto',
    ];

    private const AREA_EMPRESA = [
        1 => 'Por definir',
        2 => 'Comercial',
        3 => 'Administrativa',
        4 => 'Técnica',
    ];

    private const ESTADO = [
        1 => 'Activo',
        2 => 'Inactivo',
    ];

    public function run(): void
    {
        $this->seedManual();
        $this->importarCsv();
    }

    // ── Contratos manuales de prueba ────────────────────────────────────────

    private function seedManual(): void
    {
        $cedulasSeeder = ['1089381135'];
        $empleadoIds   = DB::table('users')->whereIn('cedula', $cedulasSeeder)->pluck('id');
        $contratoIds   = DB::table('contratos')->whereIn('empleado_id', $empleadoIds)
                            ->whereNull('id_macaw')->pluck('id');

        DB::table('contrato_centros_costos')->whereIn('contrato_id', $contratoIds)->delete();
        DB::table('contrato_anexos')->whereIn('contrato_id', $contratoIds)->delete();
        DB::table('contratos')->whereIn('id', $contratoIds)->delete();

        $empleados = DB::table('users')->whereIn('cedula', $cedulasSeeder)->pluck('id', 'cedula');

        if (!isset($empleados['1089381135'])) return;

        $contratoId = DB::table('contratos')->insertGetId([
            'empleado_id'              => $empleados['1089381135'],
            'tipo_contrato'            => 'Término Indefinido',
            'tipo_vinculacion'         => 'Directo',
            'cargo'                    => 'Auxiliar de sistemas',
            'sede'                     => 'Sede Pereira',
            'area_empresa'             => 'Área Técnica',
            'jefe_inmediato'           => 'Dirección General',
            'fecha_ingreso'            => '2022-03-01',
            'fecha_retiro'             => null,
            'salario'                  => 2500000,
            'auxilio_transporte_legal' => 162000,
            'arl'                      => 'Sura ARL',
            'fecha_vinculacion_arl'    => '2022-03-01',
            'lps_afiliado'             => 'Sura',
            'fecha_vinculacion_lps'    => '2022-03-01',
            'caja_compensacion'        => 'Comfama',
            'fecha_vinculacion_caja'   => '2022-03-01',
            'fondo_pensiones'          => 'Protección',
            'fondo_cesantias'          => 'Protección',
            'estado_contrato'          => 'Activo',
            'empleador'                => 'Servicios y Mercadeo S.A.S',
            'empresa'                  => 'Servicios y Mercadeo S.A.S',
            'cliente_proyecto'         => null,
            'origen_seguimiento'       => 'Referido empleado',
            'created_at'               => now(),
            'updated_at'               => now(),
        ]);

        DB::table('contrato_centros_costos')->insert([
            'contrato_id'   => $contratoId,
            'centro_costos' => 'Administrativo',
            'porcentaje'    => 100,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        DB::table('contrato_anexos')->insert([
            'contrato_id'        => $contratoId,
            'anexo_auxilio'      => 'Auxilio de movilización',
            'valor'              => 120000,
            'fecha_entrega_firma'=> '2022-03-01',
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);
    }

    // ── Importación desde contratos.csv ─────────────────────────────────────

    private function importarCsv(): void
    {
        $csvPath = database_path('seeders/data/contratos.csv');

        if (!file_exists($csvPath)) {
            $this->command->warn("CSV no encontrado: {$csvPath} (omitido)");
            return;
        }

        $cargosMap      = DB::table('cargos')->pluck('nombre', 'id')->toArray();
        $sedesMap       = DB::table('sedes')->pluck('nombre', 'id')->toArray();
        $empleadoresMap = DB::table('empleadores')->pluck('nombre', 'id')->toArray();
        $arlsMap        = DB::table('arls')->pluck('nombre', 'id')->toArray();
        $epsMap         = DB::table('eps')->pluck('nombre', 'id')->toArray();
        $cajasMap       = DB::table('cajas_compensacion')->pluck('nombre', 'id')->toArray();
        $fondosPensMap  = DB::table('fondos_pensiones')->pluck('nombre', 'id')->toArray();
        $fondosCesMap   = DB::table('fondos_cesantias')->pluck('nombre', 'id')->toArray();

        $id2name = fn(array $map, $val): ?string =>
            is_numeric($val) && isset($map[(int) $val]) ? $map[(int) $val] : null;

        $handle = fopen($csvPath, 'r');
        fgetcsv($handle); // saltar cabecera

        $count = $skipped = 0;

        while (($row = fgetcsv($handle)) !== false) {
            if (!isset($row[0]) || !is_numeric($row[0])) continue;

            // Buscar empleado: primero por id (users.id), luego por avanzaconoce_id
            $empleadoId = null;

            if (is_numeric($row[1] ?? '') && (int) $row[1] > 0) {
                $empleadoId = DB::table('users')->where('id', (int) $row[1])->value('id');
            }

            if (!$empleadoId && is_numeric($row[2] ?? '') && (int) $row[2] > 0) {
                $empleadoId = DB::table('users')->where('avanzaconoce_id', (int) $row[2])->value('id');
            }

            if (!$empleadoId) {
                $skipped++;
                continue;
            }

            $idMacaw      = (int) $row[0];
            $centroCostos = trim($row[8] ?? '');

            $data = [
                'empleado_id'              => $empleadoId,
                'tipo_contrato'            => self::TIPO_CONTRATO[(int) ($row[3] ?? 0)]  ?? null,
                'empleador'                => $id2name($empleadoresMap, $row[4]  ?? null),
                'cargo'                    => $id2name($cargosMap,      $row[5]  ?? null),
                'sede'                     => $id2name($sedesMap,       $row[6]  ?? null),
                'area_empresa'             => self::AREA_EMPRESA[(int) ($row[7]  ?? 0)]  ?? null,
                'jefe_inmediato'           => trim($row[9]  ?? '') ?: null,
                'fecha_ingreso'            => $this->fixDate($row[10] ?? null),
                'fecha_retiro'             => $this->fixDate($row[11] ?? null),
                'salario'                  => is_numeric($row[12] ?? '') ? (float) $row[12] : null,
                'auxilio_transporte_legal' => is_numeric($row[13] ?? '') ? (float) $row[13] : null,
                'tipo_vinculacion'         => self::TIPO_VINCULACION[(int) ($row[14] ?? 0)] ?? null,
                'arl'                      => $id2name($arlsMap,       $row[15] ?? null),
                'fecha_vinculacion_arl'    => $this->fixDate($row[16] ?? null),
                'lps_afiliado'             => $id2name($epsMap,        $row[17] ?? null),
                'fecha_vinculacion_lps'    => $this->fixDate($row[18] ?? null),
                'fondo_pensiones'          => $id2name($fondosPensMap, $row[19] ?? null),
                'fondo_cesantias'          => $id2name($fondosCesMap,  $row[20] ?? null),
                'caja_compensacion'        => $id2name($cajasMap,      $row[21] ?? null),
                'fecha_vinculacion_caja'   => $this->fixDate($row[22] ?? null),
                'estado_contrato'          => self::ESTADO[(int) ($row[23] ?? 1)] ?? 'Activo',
                'cliente_proyecto'         => trim($row[24] ?? '') ?: null,
                'updated_at'               => now(),
            ];

            try {
                $existente = DB::table('contratos')->where('id_macaw', $idMacaw)->first();

                if ($existente) {
                    DB::table('contratos')->where('id_macaw', $idMacaw)->update($data);
                    $contratoId = $existente->id;
                    DB::table('contrato_centros_costos')->where('contrato_id', $contratoId)->delete();
                } else {
                    $contratoId = DB::table('contratos')->insertGetId(
                        array_merge($data, ['id_macaw' => $idMacaw, 'created_at' => now()])
                    );
                }

                if ($centroCostos !== '' && $centroCostos !== '0') {
                    DB::table('contrato_centros_costos')->insert([
                        'contrato_id'   => $contratoId,
                        'centro_costos' => $centroCostos,
                        'porcentaje'    => 100,
                        'created_at'    => now(),
                        'updated_at'    => now(),
                    ]);
                }

                $count++;
            } catch (\Exception $e) {
                $this->command->warn("Error id_macaw={$idMacaw}: " . $e->getMessage());
            }
        }

        fclose($handle);
        $this->command->info("✓ {$count} contratos importados, {$skipped} omitidos (empleado no encontrado)");
    }

    private function fixDate(?string $v): ?string
    {
        if (!$v || strtoupper(trim($v)) === 'NULL' || trim($v) === '') return null;

        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', trim($v), $m)) return trim($v);

        $year = (int) $m[1];

        if ($year < 2) return null;           // 0001-01-01 → dato inválido

        if ($year < 100) {                    // 0019 → 2019
            $year += 2000;
        } elseif ($year < 1000) {             // 0215 → 2015, 0202 → 2002, 0223 → 2023
            $year += 1800;
        }

        return $year . '-' . $m[2] . '-' . $m[3];
    }
}
