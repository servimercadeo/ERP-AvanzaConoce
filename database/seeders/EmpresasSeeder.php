<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EmpresasSeeder extends Seeder
{
    public function run(): void
    {
        $empresas = [
            ['nombre' => 'Servimercadeo COL',        'nit' => null, 'pais' => 'Colombia'],
            ['nombre' => 'Servicios y Mercadeo COL', 'nit' => null, 'pais' => 'Colombia'],
            ['nombre' => 'Servimercadeo EC',          'nit' => null, 'pais' => 'Ecuador'],
            ['nombre' => 'Servicios y Mercadeo EC',  'nit' => null, 'pais' => 'Ecuador'],
            ['nombre' => 'E2BPO',                    'nit' => null, 'pais' => 'Colombia'],
            ['nombre' => 'CONFIANZA Y COLABORACION', 'nit' => null, 'pais' => 'Colombia'],
            ['nombre' => 'FT&H CONSULTING',          'nit' => null, 'pais' => 'Colombia'],
            ['nombre' => 'Altycom',                  'nit' => null, 'pais' => 'Colombia'],
        ];

        foreach ($empresas as $empresa) {
            DB::table('empresas')->insertOrIgnore(array_merge($empresa, [
                'activo'     => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
