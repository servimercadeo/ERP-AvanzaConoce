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
        $empServMercadeo = Empresa::where('nombre', 'Servicios y Mercadeo COL')->value('id');

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
                'sede'                => 'Sede Pereira',
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

                'rh'               => 'Aa',
                'eps'              => 'Sura',
                'arl'              => 'Sura ARL',
                'fondo_pensiones'  => 'Protección',
                'caja_compensacion'=> 'Comfama',

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

                'cargo'            => 'Auxiliar de sistemas',
                'tipo_funcionario' => 'Directo',
                'tipo_vinculacion' => 'Directo',
                'cuenta_bancaria'  => '123456789012',
                'tipo_cuenta'      => 'Ahorros',
                'banco'            => 'Bancolombia',

                'contacto_emergencia_nombre'     => 'María González',
                'contacto_emergencia_telefono'   => '3009876543',
                'contacto_emergencia_parentesco' => 'Mama',
            ],
        ];

        foreach ($empleados as $data) {
            DB::table('users')->insertOrIgnore(array_merge($data, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
