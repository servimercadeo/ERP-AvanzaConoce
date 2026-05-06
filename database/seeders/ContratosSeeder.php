<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ContratosSeeder extends Seeder
{
    public function run(): void
    {
        // Obtener los IDs de los empleados insertados por EmpleadosSeeder
        $empleados = DB::table('users')
            ->whereIn('cedula', ['1012345678', '1023456789', '1098765432', '43567890', '71234567'])
            ->pluck('id', 'cedula');

        $contratos = [
            // Juan Carlos Pérez Gómez — Técnico de Telecomunicaciones
            [
                'empleado_id'             => $empleados['1012345678'],
                'tipo_contrato'           => 'Término Indefinido',
                'tipo_vinculacion'        => 'Directo',
                'cargo'                   => 'Técnico de Telecomunicaciones',
                'sede'                    => 'Sede Principal Medellín',
                'area_empresa'            => 'Área Técnica',
                'jefe_inmediato'          => 'Carlos Alberto Martínez López',
                'fecha_ingreso'           => '2022-03-01',
                'fecha_retiro'            => null,
                'salario'                 => 2500000,
                'auxilio_transporte_legal'=> 162000,
                'arl'                     => 'Sura ARL',
                'fecha_vinculacion_arl'   => '2022-03-01',
                'lps_afiliado'            => 'Sura',
                'fecha_vinculacion_lps'   => '2022-03-01',
                'caja_compensacion'       => 'Comfama',
                'fecha_vinculacion_caja'  => '2022-03-01',
                'fondo_pensiones'         => 'Protección',
                'fondo_cesantias'         => 'Protección',
                'estado_contrato'         => 'Activo',
                'empleador'               => 'Servicios y Mercadeo S.A.S',
                'empresa'                 => 'Servicios y Mercadeo S.A.S',
                'cliente_proyecto'        => 'Proyecto DirecTV Zona Antioquia',
                'origen_seguimiento'      => 'Referido empleado',
                'centros_costos'          => [
                    ['centro_costos' => 'Proyectos DirecTV', 'porcentaje' => 100],
                ],
                'anexos'                  => [
                    ['anexo_auxilio' => 'Auxilio de movilización', 'valor' => 120000, 'fecha_entrega_firma' => '2022-03-01'],
                ],
            ],

            // Andrea Paola Sánchez Torres — Coordinadora Administrativa
            [
                'empleado_id'             => $empleados['1023456789'],
                'tipo_contrato'           => 'Término Indefinido',
                'tipo_vinculacion'        => 'Directo',
                'cargo'                   => 'Coordinadora Administrativa',
                'sede'                    => 'Sede Bogotá',
                'area_empresa'            => 'Área Administrativa',
                'jefe_inmediato'          => 'María Elena Rodríguez Vargas',
                'fecha_ingreso'           => '2021-08-15',
                'fecha_retiro'            => null,
                'salario'                 => 3500000,
                'auxilio_transporte_legal'=> 0,
                'arl'                     => 'Positiva',
                'fecha_vinculacion_arl'   => '2021-08-15',
                'lps_afiliado'            => 'Compensar',
                'fecha_vinculacion_lps'   => '2021-08-15',
                'caja_compensacion'       => 'Compensar',
                'fecha_vinculacion_caja'  => '2021-08-15',
                'fondo_pensiones'         => 'Porvenir',
                'fondo_cesantias'         => 'Porvenir',
                'estado_contrato'         => 'Activo',
                'empleador'               => 'Servicios y Mercadeo S.A.S',
                'empresa'                 => 'Servicios y Mercadeo S.A.S',
                'cliente_proyecto'        => null,
                'origen_seguimiento'      => 'Portal web',
                'centros_costos'          => [
                    ['centro_costos' => 'Administrativo', 'porcentaje' => 100],
                ],
                'anexos'                  => [
                    ['anexo_auxilio' => 'Auxilio de conectividad', 'valor' => 80000, 'fecha_entrega_firma' => '2021-08-15'],
                ],
            ],

            // Luis Fernando García Jiménez — Técnico Electricista
            [
                'empleado_id'             => $empleados['1098765432'],
                'tipo_contrato'           => 'Obra o Labor',
                'tipo_vinculacion'        => 'Indirecto',
                'cargo'                   => 'Técnico Electricista',
                'sede'                    => 'Sede Cali',
                'area_empresa'            => 'Área Técnica',
                'jefe_inmediato'          => 'Carlos Alberto Martínez López',
                'fecha_ingreso'           => '2023-01-10',
                'fecha_retiro'            => null,
                'salario'                 => 1800000,
                'auxilio_transporte_legal'=> 162000,
                'arl'                     => 'Colmena ARL',
                'fecha_vinculacion_arl'   => '2023-01-10',
                'lps_afiliado'            => 'Nueva EPS',
                'fecha_vinculacion_lps'   => '2023-01-10',
                'caja_compensacion'       => 'Comfenalco Valle',
                'fecha_vinculacion_caja'  => '2023-01-10',
                'fondo_pensiones'         => 'Colpensiones',
                'fondo_cesantias'         => 'Fondo Nacional del Ahorro',
                'estado_contrato'         => 'Activo',
                'empleador'               => 'Temporal Empleo S.A.S',
                'empresa'                 => 'Servicios y Mercadeo S.A.S',
                'cliente_proyecto'        => 'Proyecto Infraestructura Cali Sur',
                'origen_seguimiento'      => 'Empresa temporal',
                'centros_costos'          => [
                    ['centro_costos' => 'Proyectos Infraestructura', 'porcentaje' => 70],
                    ['centro_costos' => 'Operaciones Cali',          'porcentaje' => 30],
                ],
                'anexos'                  => [
                    ['anexo_auxilio' => 'Dotación',               'valor' => 200000, 'fecha_entrega_firma' => '2023-01-10'],
                    ['anexo_auxilio' => 'Auxilio de movilización', 'valor' => 100000, 'fecha_entrega_firma' => '2023-01-10'],
                ],
            ],

            // María Elena Rodríguez Vargas — Jefa de RRHH
            [
                'empleado_id'             => $empleados['43567890'],
                'tipo_contrato'           => 'Término Indefinido',
                'tipo_vinculacion'        => 'Directo',
                'cargo'                   => 'Jefa de Recursos Humanos',
                'sede'                    => 'Sede Principal Medellín',
                'area_empresa'            => 'Recursos Humanos',
                'jefe_inmediato'          => 'Carlos Alberto Martínez López',
                'fecha_ingreso'           => '2019-06-01',
                'fecha_retiro'            => null,
                'salario'                 => 6000000,
                'auxilio_transporte_legal'=> 0,
                'arl'                     => 'Sura ARL',
                'fecha_vinculacion_arl'   => '2019-06-01',
                'lps_afiliado'            => 'Sura',
                'fecha_vinculacion_lps'   => '2019-06-01',
                'caja_compensacion'       => 'Comfama',
                'fecha_vinculacion_caja'  => '2019-06-01',
                'fondo_pensiones'         => 'Protección',
                'fondo_cesantias'         => 'Protección',
                'estado_contrato'         => 'Activo',
                'empleador'               => 'Servicios y Mercadeo S.A.S',
                'empresa'                 => 'Servicios y Mercadeo S.A.S',
                'cliente_proyecto'        => null,
                'origen_seguimiento'      => 'Convocatoria interna',
                'centros_costos'          => [
                    ['centro_costos' => 'Administrativo',    'porcentaje' => 50],
                    ['centro_costos' => 'Recursos Humanos',  'porcentaje' => 50],
                ],
                'anexos'                  => [
                    ['anexo_auxilio' => 'Auxilio educativo',     'valor' => 500000, 'fecha_entrega_firma' => '2019-06-01'],
                    ['anexo_auxilio' => 'Auxilio de conectividad','valor' => 80000,  'fecha_entrega_firma' => '2019-06-01'],
                ],
            ],

            // Carlos Alberto Martínez López — Gerente Regional
            [
                'empleado_id'             => $empleados['71234567'],
                'tipo_contrato'           => 'Término Indefinido',
                'tipo_vinculacion'        => 'Directo',
                'cargo'                   => 'Gerente Regional',
                'sede'                    => 'Sede Principal Medellín',
                'area_empresa'            => 'Gerencia',
                'jefe_inmediato'          => 'Dirección General',
                'fecha_ingreso'           => '2015-02-01',
                'fecha_retiro'            => null,
                'salario'                 => 8000000,
                'auxilio_transporte_legal'=> 0,
                'arl'                     => 'Axa Colpatria',
                'fecha_vinculacion_arl'   => '2015-02-01',
                'lps_afiliado'            => 'Famisanar',
                'fecha_vinculacion_lps'   => '2015-02-01',
                'caja_compensacion'       => 'Colsubsidio',
                'fecha_vinculacion_caja'  => '2015-02-01',
                'fondo_pensiones'         => 'Porvenir',
                'fondo_cesantias'         => 'Porvenir',
                'estado_contrato'         => 'Activo',
                'empleador'               => 'Servicios y Mercadeo S.A.S',
                'empresa'                 => 'Servicios y Mercadeo S.A.S',
                'cliente_proyecto'        => null,
                'origen_seguimiento'      => 'Directo',
                'centros_costos'          => [
                    ['centro_costos' => 'Gerencia',      'porcentaje' => 60],
                    ['centro_costos' => 'Administrativo','porcentaje' => 40],
                ],
                'anexos'                  => [
                    ['anexo_auxilio' => 'Bono sodexo',           'valor' => 300000, 'fecha_entrega_firma' => '2015-02-01'],
                    ['anexo_auxilio' => 'Auxilio de conectividad','valor' => 150000, 'fecha_entrega_firma' => '2015-02-01'],
                ],
            ],
        ];

        foreach ($contratos as $data) {
            $centrosCostos = $data['centros_costos'];
            $anexos        = $data['anexos'];
            unset($data['centros_costos'], $data['anexos']);

            $contratoId = DB::table('contratos')->insertGetId(array_merge($data, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));

            foreach ($centrosCostos as $cc) {
                DB::table('contrato_centros_costos')->insert(array_merge($cc, [
                    'contrato_id' => $contratoId,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]));
            }

            foreach ($anexos as $anexo) {
                DB::table('contrato_anexos')->insert(array_merge($anexo, [
                    'contrato_id' => $contratoId,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]));
            }
        }
    }
}
