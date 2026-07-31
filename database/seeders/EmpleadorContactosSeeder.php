<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EmpleadorContactosSeeder extends Seeder
{
    private const CONTACTOS_STAFFING = [
        ['nombre' => 'Katherine Bueno',   'correo' => 'generalista.ejecafetero@staffing.com.co', 'regional' => 'EJE CAFETERO'],
        ['nombre' => 'Valentina Torres',  'correo' => 'vtorres@staffing.com.co',                  'regional' => 'ANTIOQUIA'],
        ['nombre' => 'Juan Rubio',        'correo' => 'jrubio@staffing.com.co',                   'regional' => 'BOGOTÁ Y CUNDINAMARCA'],
        ['nombre' => 'Zoraida Roa',       'correo' => 'zroa@staffing.com.co',                     'regional' => 'BOGOTÁ Y CUNDINAMARCA'],
        ['nombre' => 'Diana Parra',       'correo' => 'dparra@staffing.com.co',                   'regional' => 'ORIENTE'],
        ['nombre' => 'Liliana Hernández', 'correo' => 'ahernandez@staffing.com.co',               'regional' => 'TODO A NIVEL NACIONAL'],
        ['nombre' => 'Erika Rodríguez',   'correo' => 'eprodriguez@staffing.com.co',              'regional' => 'OCCIDENTE'],
        ['nombre' => 'Juan Lambraño',     'correo' => 'jlambrano@staffing.com.co',                'regional' => 'COSTA'],
    ];

    // empleador (nombre tal cual aparece en `empleadores`) => [contactos, nit]
    private const EMPLEADORES = [
        'STAFFING' => [
            'contactos' => self::CONTACTOS_STAFFING,
            'nit' => null,
        ],
        'SERTEMPCO' => [
            'contactos' => [
                ['nombre' => 'Gestión Humana', 'correo' => 'gestionhumana@sertempco.co', 'regional' => 'TODO A NIVEL NACIONAL'],
            ],
            'nit' => '901.414.070-1',
        ],
        'JOB AND TALENT' => [
            'contactos' => [
                ['nombre' => 'Paola Escucha', 'correo' => 'paola.escucha@jobandtalent.com', 'regional' => 'TODO A NIVEL NACIONAL'],
            ],
            'nit' => '900.896.003-1',
        ],
    ];

    public function run(): void
    {
        foreach (self::EMPLEADORES as $nombreEmpleador => $info) {
            $empleadorId = $this->buscarEmpleadorId($nombreEmpleador);

            if (!$empleadorId) {
                $this->command->warn("Empleador \"{$nombreEmpleador}\" no encontrado en la tabla `empleadores` — se omite (contactos y NIT).");
                continue;
            }

            if ($info['nit']) {
                DB::table('empleadores')->where('id', $empleadorId)->update(['nit' => $info['nit']]);
            }

            foreach ($info['contactos'] as $contacto) {
                $regionalId = $this->buscarRegionalId($contacto['regional']);

                if (!$regionalId) {
                    $this->command->warn("Regional \"{$contacto['regional']}\" no encontrada — se omite el contacto \"{$contacto['nombre']}\" de {$nombreEmpleador}.");
                    continue;
                }

                DB::table('empleador_contactos')->updateOrInsert(
                    ['empleador_id' => $empleadorId, 'correo' => $contacto['correo']],
                    [
                        'nombre'      => $contacto['nombre'],
                        'regional_id' => $regionalId,
                        'created_at'  => now(),
                        'updated_at'  => now(),
                    ]
                );
            }

            $this->command->info("✓ {$nombreEmpleador}: " . count($info['contactos']) . ' contacto(s) procesado(s).');
        }
    }

    private function buscarEmpleadorId(string $nombre): ?int
    {
        return DB::table('empleadores')
            ->whereRaw('UPPER(TRIM(nombre)) = ?', [mb_strtoupper(trim($nombre), 'UTF-8')])
            ->value('id');
    }

    private function buscarRegionalId(string $nombre): ?int
    {
        return DB::table('regionales')
            ->whereRaw('UPPER(TRIM(nombre)) = ?', [mb_strtoupper(trim($nombre), 'UTF-8')])
            ->value('id');
    }
}
