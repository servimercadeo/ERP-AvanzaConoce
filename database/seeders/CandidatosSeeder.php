<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CandidatosSeeder extends Seeder
{
    public function run(): void
    {
        Schema::disableForeignKeyConstraints();
        DB::table('candidatos')->truncate();
        Schema::enableForeignKeyConstraints();

        $req65 = DB::table('requisiciones')->where('nro_identificacion_proceso', 'REQ65')->value('id');
        $req66 = DB::table('requisiciones')->where('nro_identificacion_proceso', 'REQ66')->value('id');

        $ciudades = DB::table('ciudades')->get()->keyBy(fn($r) => strtolower(trim($r->nombre)))->map->id;
        $city     = fn(string $n) => $ciudades[strtolower($n)] ?? null;

        DB::table('candidatos')->insert([
            [
                'requisicion_id'    => $req65,
                'nombres'           => 'SIMON GALLEGO',
                'tipo_documento'    => 'Cédula de Ciudadanía',
                'identificacion'    => '1089383135',
                'fecha_expedicion'  => '2015-06-12',
                'edad'              => 29,
                'ciudad_id'         => $city('Pereira'),
                'correo'            => 'simon.23051997@gmail.com',
                'celular'           => '3217085550',
                'fecha_postulacion' => now()->toDateString(),
                'fuente'            => 'Fase Inicial',
                'fuente_especifica' => 'Pendiente de Aval',
                'estado'            => 'Contratación',
                'pruebas'           => true,
                'aval'              => true,
                'fecha_aval'        => now()->subDays(8)->toDateString(),
                'negocio'           => 'Tecnología 360',
                'observaciones'     => 'Excelente perfil técnico.',
                'created_at'        => now(),
                'updated_at'        => now(),
            ],
            [
                'requisicion_id'    => $req65,
                'nombres'           => 'JUAN CAMILO',
                'tipo_documento'    => 'Cédula de Ciudadanía',
                'identificacion'    => '1089381135',
                'fecha_expedicion'  => '2023-01-20',
                'edad'              => 21,
                'ciudad_id'         => $city('Pereira'),
                'correo'            => 'marin.jc2005@gmail.com',
                'celular'           => '3217085555',
                'fecha_postulacion' => now()->toDateString(),
                'fuente'            => 'Fase Inicial',
                'fuente_especifica' => 'Pendiente de Aval',
                'estado'            => 'Contratación',
                'pruebas'           => true,
                'aval'              => true,
                'fecha_aval'        => now()->subDays(7)->toDateString(),
                'negocio'           => 'Tecnología 360',
                'observaciones'     => 'Gran motivación.',
                'created_at'        => now(),
                'updated_at'        => now(),
            ],
            [
                'requisicion_id'    => $req66,
                'nombres'           => 'MARÍA FERNANDA TORRES',
                'tipo_documento'    => 'Cédula de Ciudadanía',
                'identificacion'    => '52890234',
                'fecha_expedicion'  => '2010-03-15',
                'edad'              => 32,
                'ciudad_id'         => $city('Bogotá'),
                'correo'            => 'mftorres@gmail.com',
                'celular'           => '3001234567',
                'fecha_postulacion' => now()->toDateString(),
                'fuente'            => 'Vinculacion directa',
                'fuente_especifica' => 'Contratar por S&M',
                'estado'            => 'Entrevista',
                'pruebas'           => false,
                'aval'              => false,
                'fecha_aval'        => now()->subDays(4)->toDateString(),
                'negocio'           => 'Expansión Norte',
                'observaciones'     => 'Buena experiencia en ventas.',
                'created_at'        => now(),
                'updated_at'        => now(),
            ],
            [
                'requisicion_id'    => $req65,
                'nombres'           => 'LAURA SOFIA ROJAS',
                'tipo_documento'    => 'Cédula de Ciudadanía',
                'identificacion'    => '1109876654',
                'fecha_expedicion'  => '2018-09-10',
                'edad'              => 27,
                'ciudad_id'         => $city('Medellín'),
                'correo'            => 'laura.rojas.avanza@gmail.com',
                'celular'           => '3205550198',
                'fecha_postulacion' => now()->toDateString(),
                'fuente'            => 'Fase Inicial',
                'fuente_especifica' => 'Pendiente de Aval',
                'estado'            => 'Contratación',
                'pruebas'           => true,
                'aval'              => true,
                'fecha_aval'        => now()->subDays(3)->toDateString(),
                'negocio'           => 'Operación Regional',
                'observaciones'     => 'Perfil administrativo sólido.',
                'created_at'        => now(),
                'updated_at'        => now(),
            ],
            [
                'requisicion_id'    => $req66,
                'nombres'           => 'ANDRES FELIPE GOMEZ',
                'tipo_documento'    => 'Cédula de Ciudadanía',
                'identificacion'    => '1002456731',
                'fecha_expedicion'  => '2017-05-21',
                'edad'              => 30,
                'ciudad_id'         => $city('Cali'),
                'correo'            => 'andres.gomez.avanza@gmail.com',
                'celular'           => '3007774421',
                'fecha_postulacion' => now()->toDateString(),
                'fuente'            => 'Vinculacion directa',
                'fuente_especifica' => 'Contratar por S&M',
                'estado'            => 'Contratación',
                'pruebas'           => true,
                'aval'              => true,
                'fecha_aval'        => now()->subDays(2)->toDateString(),
                'negocio'           => 'Ventas Valle',
                'observaciones'     => 'Muy buen manejo comercial.',
                'created_at'        => now(),
                'updated_at'        => now(),
            ],
        ]);
    }
}
