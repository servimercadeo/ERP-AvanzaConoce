<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Empresa;

class EmpleadosSeeder extends Seeder
{
    public function run(): void
    {
        $empServMercadeo  = Empresa::where('nombre', 'Servicios y Mercadeo COL')->value('id');
        $empServimercadeo = Empresa::where('nombre', 'Servimercadeo COL')->value('id');

        $empleados = [
            [
                'name'     => 'Juan Camilo Marin Zapata',
                'email'    => 'marin.jc2005@gmail.com',
                'password' => Hash::make('w*)E_QS'),
                'rol'      => 'consultor',
                'activo'   => true,
                'cedula'              => '1089381135',
                'apellidos'           => 'Marin Zapata',
                'nombres'             => 'Juan Camilo',
                'sede'                => 'Pereira',
                'fecha_nacimiento'    => '2005-10-23',
                'lugar_nacimiento'    => 'Pereira',
                'raza'                => 'Mestizo',
                'genero'              => 'Masculino',
                'estado_civil'        => 'Casado/a',
                'nivel_escolaridad'   => 'Tecnólogo',
                'direccion_residencia'=> 'Terra Grata Condominio',
                'movil'               => '3233294494',
                'estrato'             => '3',
                'barrio'              => 'Las violetas',
                'numero_hijos'        => null,
                'ingresos'            => 2500000,
                'observaciones_medicas' => 'Sin observaciones',
                'alergias'            => 'Ninguna',
                'rh'               => 'O+',
                'eps'              => 'SURA',
                'arl'              => 'SURA',
                'fondo_pensiones'  => 'PROTECCIÓN',
                'caja_compensacion'=> 'COMFAMA',
                'licencia_carro'       => null,
                'licencia_carro_vence' => null,
                'licencia_moto'        => null,
                'licencia_moto_vence'  => null,
                'tiene_cert_alturas'   => true,
                'cert_alturas_vence'   => '2026-11-20',
                'estado_empleado' => 'Activo',
                'codigo_directv'  => 'DTV-001',
                'empresa_id'      => $empServMercadeo,
                'comentarios'     => 'Empleado con buen desempeño.',
                'cargo'            => 'AUXILIAR DE SISTEMAS',
                'tipo_funcionario' => 'TÉCNICO',
                'tipo_vinculacion' => 'Empleado directo',
                'cuenta_bancaria'  => '123456789012',
                'tipo_cuenta'      => 'Ahorros',
                'banco'            => 'Bancolombia',
                'contacto_emergencia_nombre'     => 'María González',
                'contacto_emergencia_telefono'   => '3009876543',
                'contacto_emergencia_parentesco' => 'Madre',
            ],
            [
                'name'     => 'Simon Gallego Morales',
                'email'    => 'simon.gallego@empresa.com',
                'password' => Hash::make('Password123'),
                'rol'      => 'consultor',
                'activo'   => true,
                'cedula'              => '10893831135',
                'apellidos'           => 'Gallego Morales',
                'nombres'             => 'Simon',
                'sede'                => 'Medellín',
                'fecha_nacimiento'    => '1995-06-14',
                'lugar_nacimiento'    => 'Medellín',
                'raza'                => 'Mestizo',
                'genero'              => 'Masculino',
                'estado_civil'        => 'Soltero/a',
                'nivel_escolaridad'   => 'Profesional',
                'direccion_residencia'=> 'Calle 50 # 30-20, Laureles',
                'movil'               => '3104567890',
                'estrato'             => '4',
                'barrio'              => 'Laureles',
                'numero_hijos'        => 0,
                'ingresos'            => 3200000,
                'observaciones_medicas' => 'Sin observaciones',
                'alergias'            => 'Ninguna',
                'rh'               => 'O+',
                'eps'              => 'SURA',
                'arl'              => 'SURA',
                'fondo_pensiones'  => 'PROTECCIÓN',
                'caja_compensacion'=> 'COMFAMA',
                'licencia_carro'       => 'B1',
                'licencia_carro_vence' => '2028-06-14',
                'licencia_moto'        => null,
                'licencia_moto_vence'  => null,
                'tiene_cert_alturas'   => false,
                'cert_alturas_vence'   => null,
                'estado_empleado' => 'Activo',
                'codigo_directv'  => 'DTV-002',
                'empresa_id'      => $empServMercadeo,
                'comentarios'     => 'Empleado activo en área administrativa.',
                'cargo'            => 'ANALISTA ADMINISTRATIVO',
                'tipo_funcionario' => 'ADMINISTRATIVO',
                'tipo_vinculacion' => 'Empleado directo',
                'cuenta_bancaria'  => '987654321001',
                'tipo_cuenta'      => 'Ahorros',
                'banco'            => 'Davivienda',
                'contacto_emergencia_nombre'     => 'Laura Morales',
                'contacto_emergencia_telefono'   => '3156789012',
                'contacto_emergencia_parentesco' => 'Madre',
            ],
           
        ];

        foreach ($empleados as $data) {
            foreach (['nombres', 'apellidos', 'name', 'cargo', 'fondo_pensiones', 'arl', 'tipo_funcionario', 'eps', 'caja_compensacion'] as $campo) {
                if (isset($data[$campo])) {
                    $data[$campo] = mb_strtoupper($data[$campo], 'UTF-8');
                }
            }
            DB::table('users')->insertOrIgnore(array_merge($data, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        // ── IMPORTAR DESDE Users.csv ───────────────────────────────────────
        $csvPath = database_path('seeders/data/Users.csv');

        if (!file_exists($csvPath)) {
            $this->command->error("CSV no encontrado en: {$csvPath}");
            $this->command->line('Coloca el archivo Users.csv en database/seeders/data/');
            return;
        }

        // Pre-cargar todas las tablas de catálogo para evitar N+1 queries
        $sedesMap    = DB::table('sedes')->pluck('nombre', 'id')->toArray();
        $empresasMap = DB::table('empresas')->pluck('id', 'nombre')->toArray();
        $cargosMap   = DB::table('cargos')->pluck('nombre', 'id')->toArray();
        $epsMap      = DB::table('eps')->pluck('nombre', 'id')->toArray();
        $rhMap       = DB::table('tipos_rh')->pluck('nombre', 'id')->toArray();
        $ecMap       = DB::table('estados_civil')->pluck('nombre', 'id')->toArray();
        $bancosMap   = DB::table('bancos')->pluck('nombre', 'id')->toArray();
        $arlsMap     = DB::table('arls')->pluck('nombre', 'id')->toArray();
        $cajasMap    = DB::table('cajas_compensacion')->pluck('nombre', 'id')->toArray();

        $count1 = $this->importarCsv($csvPath, $sedesMap, $empresasMap, $cargosMap, $epsMap, $rhMap, $ecMap, $bancosMap, $arlsMap, $cajasMap);
        $this->command->info("✓ {$count1} usuarios importados desde Users.csv");

        // ── IMPORTAR DESDE Users2.csv ──────────────────────────────────────
        $csvPath2 = database_path('seeders/data/Users2.csv');

        if (!file_exists($csvPath2)) {
            $this->command->warn("CSV no encontrado: {$csvPath2} (omitido)");
        } else {
            $count2 = $this->importarCsv($csvPath2, $sedesMap, $empresasMap, $cargosMap, $epsMap, $rhMap, $ecMap, $bancosMap, $arlsMap, $cajasMap);
            $this->command->info("✓ {$count2} usuarios importados desde Users2.csv");
        }

        // Segundo paso: resolver jefe_inmediato a partir de id_supervisor
        $this->resolverJefesInmediatos($csvPath);
        if (file_exists($csvPath2)) {
            $this->resolverJefesInmediatos($csvPath2);
        }
        $this->command->info("✓ Jefes inmediatos resueltos");
    }

    private function importarCsv(
        string $path,
        array $sedesMap, array $empresasMap, array $cargosMap,
        array $epsMap, array $rhMap, array $ecMap,
        array $bancosMap, array $arlsMap, array $cajasMap
    ): int {
        $handle = fopen($path, 'r');
        fgetcsv($handle); // saltar cabecera

        $nullOrVal   = fn($v) => ($v === '' || strtoupper((string) $v) === 'NULL' || $v === '-') ? null : $v;
        $intOrNull   = fn($v) => ($v !== '' && is_numeric($v)) ? (int) $v : null;
        $floatOrNull = fn($v) => ($v !== '' && is_numeric($v)) ? (float) $v : null;
        $dateOrNull  = fn($v) => ($v === '' || strtoupper((string) $v) === 'NULL' || $v === '1970-01-01' || $v === '-') ? null : $v;
        $upper       = fn($v) => $v !== null ? mb_strtoupper($v, 'UTF-8') : null;
        $boolAlturas = fn($v) => !(strtolower(trim((string) $v)) === 'no' || $v === '' || strtoupper((string) $v) === 'NULL');
        $id2name     = fn(array $map, array $r, int $col): ?string =>
            isset($r[$col]) && is_numeric($r[$col]) ? ($map[(int) $r[$col]] ?? null) : null;

        $count = 0;

        while (($row = fgetcsv($handle)) !== false) {
            if (!isset($row[0]) || !is_numeric($row[0])) continue;
            if (empty(trim($row[2] ?? ''))) continue;

            $rowData = [
                'avanzaconoce_id'                => (int) $row[0],
                'name'                           => trim($row[1] ?? ''),
                'email'                          => strtolower(trim($row[2] ?? '')),
                'password'                       => $row[4] ?? '',
                'rol'                            => 'consultor',
                'activo'                         => strtolower(trim($row[32] ?? '')) === 'activo',
                'cedula'                         => $nullOrVal($row[11] ?? null),
                'apellidos'                      => $upper($nullOrVal($row[49] ?? null)),
                'nombres'                        => $upper($nullOrVal($row[77] ?? null)),
                'movil'                          => $nullOrVal($row[10] ?? null),
                'sede'                           => $id2name($sedesMap,  $row, 34),
                'empresa_id'                     => ($empresaNom = trim($row[75] ?? '')) !== ''
                                                        ? ($empresasMap[$empresaNom] ?? null) : null,
                'cargo'                          => $upper($id2name($cargosMap, $row, 40)),
                'eps'                            => $id2name($epsMap,    $row, 37),
                'rh'                             => $id2name($rhMap,     $row, 35),
                'estado_civil'                   => $id2name($ecMap,     $row, 45),
                'banco'                          => $id2name($bancosMap, $row, 76),
                'arl'                            => $id2name($arlsMap,   $row, 36),
                'caja_compensacion'              => $id2name($cajasMap,  $row, 39),
                'fecha_nacimiento'               => $dateOrNull($row[41] ?? null),
                'lugar_nacimiento'               => $nullOrVal($row[42] ?? null),
                'raza'                           => $nullOrVal($row[43] ?? null),
                'genero'                         => $nullOrVal($row[44] ?? null),
                'nivel_escolaridad'              => $nullOrVal($row[46] ?? null),
                'numero_hijos'                   => $intOrNull($row[47] ?? null),
                'direccion_residencia'           => $nullOrVal($row[50] ?? null),
                'barrio'                         => $nullOrVal($row[51] ?? null),
                'estrato'                        => $nullOrVal($row[52] ?? null),
                'contacto_emergencia_nombre'     => $nullOrVal($row[53] ?? null),
                'contacto_emergencia_telefono'   => $nullOrVal($row[54] ?? null),
                'contacto_emergencia_parentesco' => $nullOrVal($row[55] ?? null),
                'tipo_funcionario'               => $upper($nullOrVal($row[56] ?? null)),
                'observaciones_medicas'          => $nullOrVal($row[57] ?? null),
                'alergias'                       => $nullOrVal($row[58] ?? null),
                'ingresos'                       => $floatOrNull($row[59] ?? null),
                'empleador'                      => $upper($nullOrVal($row[27] ?? null)),
                'tipo_vinculacion'               => $nullOrVal($row[63] ?? null),
                'licencia_carro'                 => $nullOrVal($row[65] ?? null),
                'licencia_carro_vence'           => $dateOrNull($row[66] ?? null),
                'licencia_moto'                  => $nullOrVal($row[67] ?? null),
                'licencia_moto_vence'            => $dateOrNull($row[68] ?? null),
                'tiene_cert_alturas'             => $boolAlturas($row[69] ?? ''),
                'cert_alturas_vence'             => $dateOrNull($row[70] ?? null),
                'cuenta_bancaria'                => $nullOrVal($row[72] ?? null),
                'tipo_cuenta'                    => $nullOrVal($row[73] ?? null),
                'codigo_directv'                 => $nullOrVal($row[74] ?? null),
                'estado_empleado'                => $nullOrVal($row[32] ?? 'Activo') ?? 'Activo',
                'created_at'                     => now(),
                'updated_at'                     => now(),
            ];

            try {
                $existePorId = DB::table('users')
                    ->where('avanzaconoce_id', $rowData['avanzaconoce_id'])
                    ->exists();

                if ($existePorId) {
                    DB::table('users')
                        ->where('avanzaconoce_id', $rowData['avanzaconoce_id'])
                        ->update($rowData);
                } else {
                    // Puede que exista por email (ej: insertado manualmente sin avanzaconoce_id)
                    $existePorEmail = DB::table('users')
                        ->where('email', $rowData['email'])
                        ->exists();

                    if ($existePorEmail) {
                        DB::table('users')
                            ->where('email', $rowData['email'])
                            ->update($rowData);
                    } else {
                        DB::table('users')->insert($rowData);
                    }
                }
                $count++;
            } catch (\Exception) {
                // Omite conflictos inesperados
            }
        }

        fclose($handle);
        return $count;
    }

    private function resolverJefesInmediatos(string $path): void
    {
        $handle = fopen($path, 'r');
        fgetcsv($handle); // saltar cabecera

        while (($row = fgetcsv($handle)) !== false) {
            if (!isset($row[0]) || !is_numeric($row[0])) continue;
            if (!isset($row[20]) || !is_numeric($row[20]) || (int) $row[20] === 0) continue;

            $supervisorNombre = DB::table('users')
                ->where('avanzaconoce_id', (int) $row[20])
                ->value('name');

            if ($supervisorNombre) {
                DB::table('users')
                    ->where('avanzaconoce_id', (int) $row[0])
                    ->update(['jefe_inmediato' => mb_strtoupper($supervisorNombre, 'UTF-8')]);
            }
        }

        fclose($handle);
    }
}
