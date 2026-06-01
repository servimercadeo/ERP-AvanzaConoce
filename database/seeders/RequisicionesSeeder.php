<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class RequisicionesSeeder extends Seeder
{
    public function run(): void
    {
        Schema::disableForeignKeyConstraints();
        DB::table('requisiciones')->truncate();
        Schema::enableForeignKeyConstraints();

        $proyectos = DB::table('proyectos')->pluck('id', 'nombre');
        $cargos    = DB::table('cargos')->get()->keyBy(fn($r) => strtolower(trim($r->nombre)))->map->id;
        $ciudades  = DB::table('ciudades')->get()->keyBy(fn($r) => strtolower(trim($r->nombre)))->map->id;

        $cargo = fn(string $n) => $cargos[strtolower($n)] ?? null;
        $city  = fn(string $n) => $ciudades[strtolower($n)] ?? null;

        DB::table('requisiciones')->insert([
            [
                'nro_identificacion_proceso' => 'REQ65',
                'nro_identificacion'         => '123456789',
                'estado'                     => 'En proceso',
                'cargo_id'                   => $cargo('Analista de datos'),
                'cargo_solicitante'          => 'Coordinador de área',
                'fecha_solicitud'            => '2026-05-16',
                'fecha_ingreso'              => '2026-06-01',
                'fecha_cierre'               => '2026-06-15',
                'requeridas'                 => 2,
                'contratadas'                => 1,
                'proyecto_id'                => $proyectos['DIRECTV CO'] ?? null,
                'tipo_solicitud'             => 'RP: Reemplazo',
                'responsable'                => 'JORGE EMILIO VARON - jorgevaron@servimercadeo.com',
                'proceso'                    => 'Administrativo',
                'ciudad_id'                  => $city('Pereira'),
                'pais'                       => 'Colombia',
                'solicitud_confidencial'     => false,
                'observaciones'              => null,
                'created_at'                 => now(),
                'updated_at'                 => now(),
            ],
            [
                'nro_identificacion_proceso' => 'REQ66',
                'nro_identificacion'         => '987654321',
                'estado'                     => 'Abierta',
                'cargo_id'                   => $cargo('Asesor comercial'),
                'cargo_solicitante'          => 'Gerente comercial',
                'fecha_solicitud'            => '2026-05-20',
                'fecha_ingreso'              => '2026-06-10',
                'fecha_cierre'               => '2026-07-01',
                'requeridas'                 => 3,
                'contratadas'                => 0,
                'proyecto_id'                => $proyectos['TIGO HOME'] ?? null,
                'tipo_solicitud'             => 'CN: Cargo Nuevo',
                'responsable'                => 'ANA GOMEZ - ana.gomez@servimercadeo.com',
                'proceso'                    => 'Comercial',
                'ciudad_id'                  => $city('Bogotá'),
                'pais'                       => 'Colombia',
                'solicitud_confidencial'     => false,
                'observaciones'              => 'Perfil con experiencia en ventas B2C.',
                'created_at'                 => now(),
                'updated_at'                 => now(),
            ],
            [
                'nro_identificacion_proceso' => 'REQ67',
                'nro_identificacion'         => '112233445',
                'estado'                     => 'Abierta',
                'cargo_id'                   => $cargo('Técnico de soporte'),
                'cargo_solicitante'          => 'Coordinador técnico',
                'fecha_solicitud'            => '2026-05-22',
                'fecha_ingreso'              => '2026-06-15',
                'fecha_cierre'               => '2026-07-10',
                'requeridas'                 => 1,
                'contratadas'                => 0,
                'proyecto_id'                => $proyectos['HUGHES COL'] ?? null,
                'tipo_solicitud'             => 'RP: Reemplazo',
                'responsable'                => 'LUIS MARTINEZ - luis.martinez@servimercadeo.com',
                'proceso'                    => 'Operativo',
                'ciudad_id'                  => $city('Medellín'),
                'pais'                       => 'Colombia',
                'solicitud_confidencial'     => false,
                'observaciones'              => null,
                'created_at'                 => now(),
                'updated_at'                 => now(),
            ],
        ]);
    }
}
