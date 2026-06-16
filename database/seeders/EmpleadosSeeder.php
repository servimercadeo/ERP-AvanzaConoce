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
                'password' => '$2y$12$.IBwM/iM2Im2jgFXzQfqHO5Sq5Z/X.vczt1SXo1Shap1.IeSMNMk.',
                'rol'      => 'administrador',
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
                'barrio'              => 'Las Violetas',
                'numero_hijos'        => null,
                'ingresos'            => 2500000,
                'observaciones_medicas' => 'Sin observaciones',
                'alergias'            => 'Ninguna',
                'rh'               => 'O+',
                'eps'              => 'SURA EPS',
                'arl'              => 'SURA',
                'fondo_pensiones'  => 'PROTECCION',
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
                'comentarios'     => 'Administrador del sistema.',
                'cargo'            => 'AUXILIAR DE SISTEMAS',
                'tipo_funcionario' => 'TÉCNICO',
                'tipo_vinculacion' => 'Empleado directo',
                'cuenta_bancaria'  => '123456789012',
                'tipo_cuenta'      => 'Ahorros',
                'banco'            => 'BANCOLOMBIA',
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
                'cedula'              => '1098765432',
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
                'eps'              => 'SURA EPS',
                'arl'              => 'SURA',
                'fondo_pensiones'  => 'PROTECCION',
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
                'comentarios'     => 'Analista administrativo área comercial.',
                'cargo'            => 'ANALISTA ADMINISTRATIVO',
                'tipo_funcionario' => 'ADMINISTRATIVO',
                'tipo_vinculacion' => 'Empleado directo',
                'cuenta_bancaria'  => '987654321001',
                'tipo_cuenta'      => 'Ahorros',
                'banco'            => 'DAVIVIENDA',
                'contacto_emergencia_nombre'     => 'Laura Morales',
                'contacto_emergencia_telefono'   => '3156789012',
                'contacto_emergencia_parentesco' => 'Madre',
            ],
                [
                'name'     => 'OSCAR JULIAN VALENCIA TORO',
                'email'    => 'gerencia.th@servimercadeo.com',
                'password' => Hash::make('1088003312*'),
                'rol'      => 'GERENTE DE TALENTO HUMANO',
                'activo'   => true,
                'cedula'              => '1088003312',
                'apellidos'           => 'VALENCIA TORO',
                'nombres'             => 'OSCAR JULIAN',
                'sede'                => 'Medellín',
                'fecha_nacimiento'    => '1990-06-21',
                'lugar_nacimiento'    => 'Pereira',
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
                'eps'              => 'SURA EPS',
                'arl'              => 'SURA',
                'fondo_pensiones'  => 'PROTECCION',
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
                'comentarios'     => 'Analista administrativo área comercial.',
                'cargo'            => 'ANALISTA ADMINISTRATIVO',
                'tipo_funcionario' => 'ADMINISTRATIVO',
                'tipo_vinculacion' => 'Empleado directo',
                'cuenta_bancaria'  => '987654321001',
                'tipo_cuenta'      => 'Ahorros',
                'banco'            => 'DAVIVIENDA',
                'contacto_emergencia_nombre'     => 'Laura Morales',
                'contacto_emergencia_telefono'   => '3156789012',
                'contacto_emergencia_parentesco' => 'Madre',
            ],
            
            
            
        ];

        $upper = fn($v) => $v !== null ? mb_strtoupper($v, 'UTF-8') : null;
        $upperFields = ['nombres', 'apellidos', 'name', 'cargo', 'fondo_pensiones', 'arl', 'tipo_funcionario', 'eps', 'caja_compensacion', 'banco'];

        foreach ($empleados as $data) {
            foreach ($upperFields as $campo) {
                if (isset($data[$campo])) {
                    $data[$campo] = $upper($data[$campo]);
                }
            }

            DB::table('users')->insertOrIgnore(array_merge($data, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        $this->command->info('✓ ' . count($empleados) . ' empleados insertados');
    }
}
