<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BaseIngresosSeeder extends Seeder
{
    public function run(): void
    {
        $proyectos = DB::table('proyectos')->pluck('id', 'nombre');

        DB::table('base_ingresos')->insert([
            // DIRECTV CO
            ['cargo' => 'Asesor comercial',     'proyecto_id' => $proyectos['DIRECTV CO'] ?? null,   'salario_base' => 1423500, 'auxilio_transporte' => 200000, 'tipo_contrato' => 'Término fijo',        'descripcion' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['cargo' => 'Analista de datos',    'proyecto_id' => $proyectos['DIRECTV CO'] ?? null,   'salario_base' => 2200000, 'auxilio_transporte' => 0,      'tipo_contrato' => 'Término indefinido',   'descripcion' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            // TIGO HOME
            ['cargo' => 'Asesor comercial',     'proyecto_id' => $proyectos['TIGO HOME'] ?? null,    'salario_base' => 1423500, 'auxilio_transporte' => 200000, 'tipo_contrato' => 'Término fijo',        'descripcion' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['cargo' => 'Coordinador de área',  'proyecto_id' => $proyectos['TIGO HOME'] ?? null,    'salario_base' => 3500000, 'auxilio_transporte' => 0,      'tipo_contrato' => 'Término indefinido',   'descripcion' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            // TIGO TROPAS
            ['cargo' => 'Técnico de campo',     'proyecto_id' => $proyectos['TIGO TROPAS'] ?? null,  'salario_base' => 1600000, 'auxilio_transporte' => 200000, 'tipo_contrato' => 'Obra y labor',         'descripcion' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            // HUGHES COL
            ['cargo' => 'Técnico de soporte',   'proyecto_id' => $proyectos['HUGHES COL'] ?? null,   'salario_base' => 1800000, 'auxilio_transporte' => 200000, 'tipo_contrato' => 'Término fijo',        'descripcion' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            // BANCOLDEX
            ['cargo' => 'Gestor de cobranza',   'proyecto_id' => $proyectos['BANCOLDEX'] ?? null,    'salario_base' => 1500000, 'auxilio_transporte' => 200000, 'tipo_contrato' => 'Término fijo',        'descripcion' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            // S&M ASESORES
            ['cargo' => 'Analista de datos',    'proyecto_id' => $proyectos['S&M ASESORES'] ?? null, 'salario_base' => 2500000, 'auxilio_transporte' => 0,      'tipo_contrato' => 'Término indefinido',   'descripcion' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['cargo' => 'Desarrollador',        'proyecto_id' => $proyectos['S&M ASESORES'] ?? null, 'salario_base' => 4000000, 'auxilio_transporte' => 0,      'tipo_contrato' => 'Término indefinido',   'descripcion' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
            ['cargo' => 'Gerente de proyecto',  'proyecto_id' => $proyectos['S&M ASESORES'] ?? null, 'salario_base' => 6000000, 'auxilio_transporte' => 0,      'tipo_contrato' => 'Término indefinido',   'descripcion' => null, 'activo' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
