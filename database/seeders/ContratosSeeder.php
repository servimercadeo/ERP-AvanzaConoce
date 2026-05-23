<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ContratosSeeder extends Seeder
{
    public function run(): void
    {
        $contratos = [
            [
                'cedula'          => '1089381135',
                'tipo_contrato'   => 'Término Indefinido',
                'tipo_vinculacion'=> 'Directo',
                'cargo'           => 'Auxiliar de sistemas',
                'sede'            => 'Sede Pereira',
                'area_empresa'    => 'Área Técnica',
                'jefe_inmediato'  => 'JORGE EMILIO VARON CASTILLO',
                'fecha_ingreso'   => '2022-03-01',
                'salario'                  => 2500000,
                'auxilio_transporte_legal' => 162000,
                'arl'                      => 'Sura ARL',
                'fecha_vinculacion_arl'    => '2022-03-01',
                'lps_afiliado'             => 'Sura EPS',
                'fecha_vinculacion_lps'    => '2022-03-01',
                'caja_compensacion'        => 'Comfama',
                'fecha_vinculacion_caja'   => '2022-03-01',
                'fondo_pensiones'          => 'Protección',
                'fondo_cesantias'          => 'Protección',
                'estado_contrato'          => 'Activo',
                'empleador'                => 'Servicios y Mercadeo S.A.S',
                'empresa'                  => 'Servicios y Mercadeo S.A.S',
                'origen_seguimiento'       => 'Referido empleado',
                'centro_costos'            => 'Administrativo',
                'anexo_auxilio'            => 'Auxilio de movilización',
                'valor_anexo'              => 120000,
                'fecha_entrega_firma'      => '2022-03-01',
            ],
            [
                'cedula'          => '1098765432',
                'tipo_contrato'   => 'Término Fijo',
                'tipo_vinculacion'=> 'Directo',
                'cargo'           => 'Analista administrativo',
                'sede'            => 'Sede Medellín',
                'area_empresa'    => 'Área Administrativa',
                'jefe_inmediato'  => 'JORGE EMILIO VARON CASTILLO',
                'fecha_ingreso'   => '2023-01-16',
                'salario'                  => 3200000,
                'auxilio_transporte_legal' => 162000,
                'arl'                      => 'Sura ARL',
                'fecha_vinculacion_arl'    => '2023-01-16',
                'lps_afiliado'             => 'Sura EPS',
                'fecha_vinculacion_lps'    => '2023-01-16',
                'caja_compensacion'        => 'Comfama',
                'fecha_vinculacion_caja'   => '2023-01-16',
                'fondo_pensiones'          => 'Protección',
                'fondo_cesantias'          => 'Colfondos',
                'estado_contrato'          => 'Activo',
                'empleador'                => 'Servicios y Mercadeo S.A.S',
                'empresa'                  => 'Servicios y Mercadeo S.A.S',
                'origen_seguimiento'       => 'Portal de empleo',
                'centro_costos'            => 'Administrativo',
                'anexo_auxilio'            => null,
                'valor_anexo'              => null,
                'fecha_entrega_firma'      => null,
            ],
            [
                'cedula'          => '43876543',
                'tipo_contrato'   => 'Término Indefinido',
                'tipo_vinculacion'=> 'Directo',
                'cargo'           => 'Analista de talento humano',
                'sede'            => 'Sede Pereira',
                'area_empresa'    => 'Área Administrativa',
                'jefe_inmediato'  => 'JORGE EMILIO VARON CASTILLO',
                'fecha_ingreso'   => '2021-08-02',
                'salario'                  => 2800000,
                'auxilio_transporte_legal' => 162000,
                'arl'                      => 'Positiva',
                'fecha_vinculacion_arl'    => '2021-08-02',
                'lps_afiliado'             => 'Comfamiliar Risaralda',
                'fecha_vinculacion_lps'    => '2021-08-02',
                'caja_compensacion'        => 'Comfamiliar Risaralda',
                'fecha_vinculacion_caja'   => '2021-08-02',
                'fondo_pensiones'          => 'Porvenir',
                'fondo_cesantias'          => 'Porvenir',
                'estado_contrato'          => 'Activo',
                'empleador'                => 'Servicios y Mercadeo S.A.S',
                'empresa'                  => 'Servicios y Mercadeo S.A.S',
                'origen_seguimiento'       => 'Referido empleado',
                'centro_costos'            => 'Talento Humano',
                'anexo_auxilio'            => 'Auxilio de alimentación',
                'valor_anexo'              => 80000,
                'fecha_entrega_firma'      => '2021-08-02',
            ],
            [
                'cedula'          => '71234567',
                'tipo_contrato'   => 'Término Indefinido',
                'tipo_vinculacion'=> 'Directo',
                'cargo'           => 'Coordinador comercial',
                'sede'            => 'Sede Medellín',
                'area_empresa'    => 'Área Comercial',
                'jefe_inmediato'  => 'SIMON GALLEGO MORALES',
                'fecha_ingreso'   => '2020-05-11',
                'salario'                  => 4500000,
                'auxilio_transporte_legal' => null,
                'arl'                      => 'Sura ARL',
                'fecha_vinculacion_arl'    => '2020-05-11',
                'lps_afiliado'             => 'Sura EPS',
                'fecha_vinculacion_lps'    => '2020-05-11',
                'caja_compensacion'        => 'Comfama',
                'fecha_vinculacion_caja'   => '2020-05-11',
                'fondo_pensiones'          => 'Colfondos',
                'fondo_cesantias'          => 'Colfondos',
                'estado_contrato'          => 'Activo',
                'empleador'                => 'Servimercadeo COL',
                'empresa'                  => 'Servimercadeo COL',
                'origen_seguimiento'       => 'Portal de empleo',
                'centro_costos'            => 'Comercial',
                'anexo_auxilio'            => 'Auxilio de rodamiento',
                'valor_anexo'              => 350000,
                'fecha_entrega_firma'      => '2020-05-11',
            ],
            [
                'cedula'          => '52345678',
                'tipo_contrato'   => 'Término Fijo',
                'tipo_vinculacion'=> 'Directo',
                'cargo'           => 'Supervisor de operaciones',
                'sede'            => 'Sede Cali',
                'area_empresa'    => 'Área Técnica',
                'jefe_inmediato'  => 'JORGE EMILIO VARON CASTILLO',
                'fecha_ingreso'   => '2022-11-07',
                'salario'                  => 2600000,
                'auxilio_transporte_legal' => 162000,
                'arl'                      => 'Positiva',
                'fecha_vinculacion_arl'    => '2022-11-07',
                'lps_afiliado'             => 'Nueva E.P.S',
                'fecha_vinculacion_lps'    => '2022-11-07',
                'caja_compensacion'        => 'Comfandi',
                'fecha_vinculacion_caja'   => '2022-11-07',
                'fondo_pensiones'          => 'Colpensiones',
                'fondo_cesantias'          => 'Colpensiones',
                'estado_contrato'          => 'Activo',
                'empleador'                => 'Servimercadeo COL',
                'empresa'                  => 'Servimercadeo COL',
                'origen_seguimiento'       => 'Bolsa de trabajo',
                'centro_costos'            => 'Operativo',
                'anexo_auxilio'            => null,
                'valor_anexo'              => null,
                'fecha_entrega_firma'      => null,
            ],
            [
                'cedula'          => '94567890',
                'tipo_contrato'   => 'Término Indefinido',
                'tipo_vinculacion'=> 'Directo',
                'cargo'           => 'Gerente de procesos administrativos',
                'sede'            => 'Sede Pereira',
                'area_empresa'    => 'Área Administrativa',
                'jefe_inmediato'  => 'DIRECCIÓN GENERAL',
                'fecha_ingreso'   => '2018-02-01',
                'salario'                  => 5800000,
                'auxilio_transporte_legal' => null,
                'arl'                      => 'Sura ARL',
                'fecha_vinculacion_arl'    => '2018-02-01',
                'lps_afiliado'             => 'Sura EPS',
                'fecha_vinculacion_lps'    => '2018-02-01',
                'caja_compensacion'        => 'Comfamiliar Risaralda',
                'fecha_vinculacion_caja'   => '2018-02-01',
                'fondo_pensiones'          => 'Protección',
                'fondo_cesantias'          => 'Protección',
                'estado_contrato'          => 'Activo',
                'empleador'                => 'Servicios y Mercadeo S.A.S',
                'empresa'                  => 'Servicios y Mercadeo S.A.S',
                'origen_seguimiento'       => 'Referido externo',
                'centro_costos'            => 'Administrativo',
                'anexo_auxilio'            => 'Auxilio de vehículo',
                'valor_anexo'              => 500000,
                'fecha_entrega_firma'      => '2018-02-01',
            ],
        ];

        foreach ($contratos as $data) {
            $empleadoId = DB::table('users')->where('cedula', $data['cedula'])->value('id');

            if (!$empleadoId) {
                $this->command->warn("Empleado no encontrado: cédula {$data['cedula']}");
                continue;
            }

            $existente = DB::table('contratos')
                ->where('empleado_id', $empleadoId)
                ->whereNull('id_macaw')
                ->first();

            if ($existente) {
                $this->command->warn("Contrato ya existe para cédula {$data['cedula']} — omitido");
                continue;
            }

            $contratoId = DB::table('contratos')->insertGetId([
                'empleado_id'              => $empleadoId,
                'tipo_contrato'            => $data['tipo_contrato'],
                'tipo_vinculacion'         => $data['tipo_vinculacion'],
                'cargo'                    => $data['cargo'],
                'sede'                     => $data['sede'],
                'area_empresa'             => $data['area_empresa'],
                'jefe_inmediato'           => $data['jefe_inmediato'],
                'fecha_ingreso'            => $data['fecha_ingreso'],
                'fecha_retiro'             => null,
                'salario'                  => $data['salario'],
                'auxilio_transporte_legal' => $data['auxilio_transporte_legal'],
                'arl'                      => $data['arl'],
                'fecha_vinculacion_arl'    => $data['fecha_vinculacion_arl'],
                'lps_afiliado'             => $data['lps_afiliado'],
                'fecha_vinculacion_lps'    => $data['fecha_vinculacion_lps'],
                'caja_compensacion'        => $data['caja_compensacion'],
                'fecha_vinculacion_caja'   => $data['fecha_vinculacion_caja'],
                'fondo_pensiones'          => $data['fondo_pensiones'],
                'fondo_cesantias'          => $data['fondo_cesantias'],
                'estado_contrato'          => $data['estado_contrato'],
                'empleador'                => $data['empleador'],
                'empresa'                  => $data['empresa'],
                'cliente_proyecto'         => null,
                'origen_seguimiento'       => $data['origen_seguimiento'],
                'created_at'               => now(),
                'updated_at'               => now(),
            ]);

            DB::table('contrato_centros_costos')->insert([
                'contrato_id'   => $contratoId,
                'centro_costos' => $data['centro_costos'],
                'porcentaje'    => 100,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);

            if ($data['anexo_auxilio']) {
                DB::table('contrato_anexos')->insert([
                    'contrato_id'         => $contratoId,
                    'anexo_auxilio'       => $data['anexo_auxilio'],
                    'valor'               => $data['valor_anexo'],
                    'fecha_entrega_firma' => $data['fecha_entrega_firma'],
                    'created_at'          => now(),
                    'updated_at'          => now(),
                ]);
            }
        }

        $this->command->info('✓ Contratos insertados');
    }
}
