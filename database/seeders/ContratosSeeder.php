<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ContratosSeeder extends Seeder
{
    public function run(): void
    {
        // Limpiar contratos existentes para evitar duplicados al re-sembrar
        $cedulasSeeder = ['1089381135'];
        $empleadoIds = DB::table('users')->whereIn('cedula', $cedulasSeeder)->pluck('id');
        $contratoIds = DB::table('contratos')->whereIn('empleado_id', $empleadoIds)->pluck('id');
        DB::table('contrato_centros_costos')->whereIn('contrato_id', $contratoIds)->delete();
        DB::table('contrato_anexos')->whereIn('contrato_id', $contratoIds)->delete();
        DB::table('contratos')->whereIn('empleado_id', $empleadoIds)->delete();

        $empleados = DB::table('users')
            ->whereIn('cedula', $cedulasSeeder)
            ->pluck('id', 'cedula');

        $contratos = [
            // Juan Camilo Marin Zapata — Auxiliar de sistemas
            [
                'empleado_id'             => $empleados['1089381135'],
                'tipo_contrato'           => 'Término Indefinido',
                'tipo_vinculacion'        => 'Directo',
                'cargo'                   => 'Auxiliar de sistemas',
                'sede'                    => 'Sede Pereira',
                'area_empresa'            => 'Área Técnica',
                'jefe_inmediato'          => 'Dirección General',
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
                'cliente_proyecto'        => null,
                'origen_seguimiento'      => 'Referido empleado',
                'centros_costos'          => [
                    ['centro_costos' => 'Administrativo', 'porcentaje' => 100],
                ],
                'anexos'                  => [
                    ['anexo_auxilio' => 'Auxilio de movilización', 'valor' => 120000, 'fecha_entrega_firma' => '2022-03-01'],
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
