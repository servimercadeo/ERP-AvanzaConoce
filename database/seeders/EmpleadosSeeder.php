<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class EmpleadosSeeder extends Seeder
{
    public function run(): void
    {
        $empleados = [
            [
                // Acceso al sistema
                'name'     => 'Juan Carlos Pérez Gómez',
                'email'    => 'jperez@empresa.com',
                'password' => Hash::make('Password123!'),
                'rol'      => 'consultor',
                'activo'   => true,

                // Información General
                'cedula'              => '1012345678',
                'apellidos'           => 'Pérez Gómez',
                'nombres'             => 'Juan Carlos',
                'sede'                => 'Sede Principal Medellín',
                'fecha_nacimiento'    => '1990-03-15',
                'lugar_nacimiento'    => 'Medellín',
                'raza'                => 'Mestizo',
                'genero'              => 'Masculino',
                'estado_civil'        => 'Casado/a',
                'nivel_escolaridad'   => 'Tecnólogo',
                'direccion_residencia'=> 'Calle 45 # 32-10, Laureles',
                'movil'               => '3001234567',
                'estrato'             => '3',
                'barrio'              => 'Laureles',
                'numero_hijos'        => 1,
                'ingresos'            => 2500000,
                'observaciones_medicas' => 'Sin observaciones',
                'alergias'            => 'Ninguna',

                // Seguridad Social
                'rh'               => 'O+',
                'eps'              => 'Sura',
                'arl'              => 'Sura ARL',
                'fondo_pensiones'  => 'Protección',
                'caja_compensacion'=> 'Comfama',

                // Licencias y certificaciones
                'licencia_carro'       => 'B1',
                'licencia_carro_vence' => '2027-06-30',
                'licencia_moto'        => null,
                'licencia_moto_vence'  => null,
                'tiene_cert_alturas'   => true,
                'cert_alturas_vence'   => '2026-11-20',

                // Estado
                'estado_empleado' => 'Activo',
                'codigo_directv'  => 'DTV-001',
                'empresa'         => 'Servicios y Mercadeo S.A.S',
                'comentarios'     => 'Empleado con buen desempeño.',

                // Información Adicional
                'cargo'            => 'Técnico de Telecomunicaciones',
                'tipo_funcionario' => 'Operativo',
                'tipo_vinculacion' => 'Directo',
                'cuenta_bancaria'  => '123456789012',
                'tipo_cuenta'      => 'Ahorros',
                'banco'            => 'Bancolombia',

                // Contacto de emergencia
                'contacto_emergencia_nombre'     => 'María González',
                'contacto_emergencia_telefono'   => '3009876543',
                'contacto_emergencia_parentesco' => 'Esposa',
            ],
            [
                'name'     => 'Andrea Paola Sánchez Torres',
                'email'    => 'asanchez@empresa.com',
                'password' => Hash::make('Password123!'),
                'rol'      => 'consultor',
                'activo'   => true,

                'cedula'              => '1023456789',
                'apellidos'           => 'Sánchez Torres',
                'nombres'             => 'Andrea Paola',
                'sede'                => 'Sede Bogotá',
                'fecha_nacimiento'    => '1993-07-22',
                'lugar_nacimiento'    => 'Bogotá',
                'raza'                => 'Mestizo',
                'genero'              => 'Femenino',
                'estado_civil'        => 'Soltero/a',
                'nivel_escolaridad'   => 'Profesional',
                'direccion_residencia'=> 'Carrera 13 # 85-40, Chapinero',
                'movil'               => '3112345678',
                'estrato'             => '4',
                'barrio'              => 'Chapinero',
                'numero_hijos'        => 0,
                'ingresos'            => 3500000,
                'observaciones_medicas' => 'Hipertensión leve controlada',
                'alergias'            => 'Polen',

                'rh'               => 'A+',
                'eps'              => 'Compensar',
                'arl'              => 'Positiva',
                'fondo_pensiones'  => 'Porvenir',
                'caja_compensacion'=> 'Compensar',

                'licencia_carro'       => 'B1',
                'licencia_carro_vence' => '2028-04-15',
                'licencia_moto'        => 'A2',
                'licencia_moto_vence'  => '2028-04-15',
                'tiene_cert_alturas'   => false,
                'cert_alturas_vence'   => null,

                'estado_empleado' => 'Activo',
                'codigo_directv'  => 'DTV-002',
                'empresa'         => 'Servicios y Mercadeo S.A.S',
                'comentarios'     => 'Coordinadora de área administrativa.',

                'cargo'            => 'Coordinadora Administrativa',
                'tipo_funcionario' => 'Administrativo',
                'tipo_vinculacion' => 'Directo',
                'cuenta_bancaria'  => '987654321098',
                'tipo_cuenta'      => 'Corriente',
                'banco'            => 'Davivienda',

                'contacto_emergencia_nombre'     => 'Carlos Sánchez',
                'contacto_emergencia_telefono'   => '3154321098',
                'contacto_emergencia_parentesco' => 'Padre',
            ],
            [
                'name'     => 'Luis Fernando García Jiménez',
                'email'    => 'lgarcia@empresa.com',
                'password' => Hash::make('Password123!'),
                'rol'      => 'consultor',
                'activo'   => true,

                'cedula'              => '1098765432',
                'apellidos'           => 'García Jiménez',
                'nombres'             => 'Luis Fernando',
                'sede'                => 'Sede Cali',
                'fecha_nacimiento'    => '1985-11-08',
                'lugar_nacimiento'    => 'Cali',
                'raza'                => 'Afrodescendiente',
                'genero'              => 'Masculino',
                'estado_civil'        => 'Unión Libre',
                'nivel_escolaridad'   => 'Bachillerato',
                'direccion_residencia'=> 'Avenida 5N # 23-60, Granada',
                'movil'               => '3205678901',
                'estrato'             => '2',
                'barrio'              => 'Granada',
                'numero_hijos'        => 2,
                'ingresos'            => 1800000,
                'observaciones_medicas' => 'Sin observaciones',
                'alergias'            => 'Ninguna',

                'rh'               => 'B+',
                'eps'              => 'Nueva EPS',
                'arl'              => 'Colmena ARL',
                'fondo_pensiones'  => 'Colpensiones',
                'caja_compensacion'=> 'Comfenalco Valle',

                'licencia_carro'       => null,
                'licencia_carro_vence' => null,
                'licencia_moto'        => 'A1',
                'licencia_moto_vence'  => '2026-09-10',
                'tiene_cert_alturas'   => true,
                'cert_alturas_vence'   => '2025-12-15',

                'estado_empleado' => 'Activo',
                'codigo_directv'  => 'DTV-003',
                'empresa'         => 'Servicios y Mercadeo S.A.S',
                'comentarios'     => 'Operario de campo con experiencia en altura.',

                'cargo'            => 'Técnico Electricista',
                'tipo_funcionario' => 'Operativo',
                'tipo_vinculacion' => 'Indirecto',
                'cuenta_bancaria'  => '456789012345',
                'tipo_cuenta'      => 'Ahorros',
                'banco'            => 'Banco de Bogotá',

                'contacto_emergencia_nombre'     => 'Rosa Jiménez',
                'contacto_emergencia_telefono'   => '3176543210',
                'contacto_emergencia_parentesco' => 'Madre',
            ],
            [
                'name'     => 'María Elena Rodríguez Vargas',
                'email'    => 'mrodriguez@empresa.com',
                'password' => Hash::make('Password123!'),
                'rol'      => 'gestor',
                'activo'   => true,

                'cedula'              => '43567890',
                'apellidos'           => 'Rodríguez Vargas',
                'nombres'             => 'María Elena',
                'sede'                => 'Sede Principal Medellín',
                'fecha_nacimiento'    => '1988-05-30',
                'lugar_nacimiento'    => 'Pereira',
                'raza'                => 'Mestizo',
                'genero'              => 'Femenino',
                'estado_civil'        => 'Casado/a',
                'nivel_escolaridad'   => 'Especialización',
                'direccion_residencia'=> 'Calle 10 # 43-55, El Poblado',
                'movil'               => '3008765432',
                'estrato'             => '5',
                'barrio'              => 'El Poblado',
                'numero_hijos'        => 1,
                'ingresos'            => 6000000,
                'observaciones_medicas' => 'Sin observaciones',
                'alergias'            => 'Ibuprofeno',

                'rh'               => 'AB+',
                'eps'              => 'Sura',
                'arl'              => 'Sura ARL',
                'fondo_pensiones'  => 'Protección',
                'caja_compensacion'=> 'Comfama',

                'licencia_carro'       => 'B1',
                'licencia_carro_vence' => '2029-03-01',
                'licencia_moto'        => null,
                'licencia_moto_vence'  => null,
                'tiene_cert_alturas'   => false,
                'cert_alturas_vence'   => null,

                'estado_empleado' => 'Activo',
                'codigo_directv'  => null,
                'empresa'         => 'Servicios y Mercadeo S.A.S',
                'comentarios'     => 'Gestora de Recursos Humanos.',

                'cargo'            => 'Jefa de Recursos Humanos',
                'tipo_funcionario' => 'Administrativo',
                'tipo_vinculacion' => 'Directo',
                'cuenta_bancaria'  => '321098765432',
                'tipo_cuenta'      => 'Nómina',
                'banco'            => 'Bancolombia',

                'contacto_emergencia_nombre'     => 'Pedro Rodríguez',
                'contacto_emergencia_telefono'   => '3143216789',
                'contacto_emergencia_parentesco' => 'Esposo',
            ],
            [
                'name'     => 'Carlos Alberto Martínez López',
                'email'    => 'cmartinez@empresa.com',
                'password' => Hash::make('Password123!'),
                'rol'      => 'admin',
                'activo'   => true,

                'cedula'              => '71234567',
                'apellidos'           => 'Martínez López',
                'nombres'             => 'Carlos Alberto',
                'sede'                => 'Sede Principal Medellín',
                'fecha_nacimiento'    => '1982-01-17',
                'lugar_nacimiento'    => 'Medellín',
                'raza'                => 'Mestizo',
                'genero'              => 'Masculino',
                'estado_civil'        => 'Casado/a',
                'nivel_escolaridad'   => 'Profesional',
                'direccion_residencia'=> 'Carrera 48 # 20-45, Buenos Aires',
                'movil'               => '3157654321',
                'estrato'             => '4',
                'barrio'              => 'Buenos Aires',
                'numero_hijos'        => 3,
                'ingresos'            => 8000000,
                'observaciones_medicas' => 'Diabetes tipo 2 controlada',
                'alergias'            => 'Penicilina',

                'rh'               => 'O-',
                'eps'              => 'Famisanar',
                'arl'              => 'Axa Colpatria',
                'fondo_pensiones'  => 'Porvenir',
                'caja_compensacion'=> 'Colsubsidio',

                'licencia_carro'       => 'C1',
                'licencia_carro_vence' => '2030-08-25',
                'licencia_moto'        => 'A2',
                'licencia_moto_vence'  => '2030-08-25',
                'tiene_cert_alturas'   => true,
                'cert_alturas_vence'   => '2027-02-28',

                'estado_empleado' => 'Activo',
                'codigo_directv'  => 'DTV-005',
                'empresa'         => 'Servicios y Mercadeo S.A.S',
                'comentarios'     => 'Gerente Regional con 10 años de experiencia.',

                'cargo'            => 'Gerente Regional',
                'tipo_funcionario' => 'Directivo',
                'tipo_vinculacion' => 'Directo',
                'cuenta_bancaria'  => '654321098765',
                'tipo_cuenta'      => 'Corriente',
                'banco'            => 'BBVA',

                'contacto_emergencia_nombre'     => 'Ana Martínez',
                'contacto_emergencia_telefono'   => '3189012345',
                'contacto_emergencia_parentesco' => 'Esposa',
            ],
        ];

        foreach ($empleados as $data) {
            DB::table('users')->insert(array_merge($data, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
