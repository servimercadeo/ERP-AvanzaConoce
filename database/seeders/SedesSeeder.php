<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SedesSeeder extends Seeder
{
    /**
     * Nombre de proyecto tal como viene en sedes_activas.csv => nombre exacto en la tabla
     * `proyectos`. "ADMINISTRACION" y "DIRECTV COL" son los alias de negocio para "SOLO
     * AUSENTISMOS" y "DIRECTV CO" respectivamente (ver App\Services\EmpresaProyectoRules).
     */
    private const CSV_PROYECTO_A_PROYECTOS = [
        'ADMINISTRACION' => 'SOLO AUSENTISMOS',
        'DIRECTV COL'    => 'DIRECTV CO',
        'TIGO EXPRESS'   => 'TIGO EXPRESS',
        'TIGO HOME'      => 'TIGO HOME',
        'HUGHES COL'     => 'HUGHES COL',
        'S&M ASESORES'   => 'S&M ASESORES',
    ];

    public function run(): void
    {
        $csvPath = database_path('seeders/data/sedes_activas.csv');

        if (!file_exists($csvPath)) {
            $this->command->error("CSV no encontrado en: {$csvPath}");
            return;
        }

        $proyectoIds = DB::table('proyectos')->pluck('id', 'nombre');

        $handle = fopen($csvPath, 'r');
        fgetcsv($handle); // saltar cabecera

        $sedeIdPorNombre = [];
        $relaciones = [];

        while (($row = fgetcsv($handle)) !== false) {
            $proyectoCsv = trim($row[1] ?? '');
            $nombreSede  = trim($row[2] ?? '');
            if ($nombreSede === '') {
                continue;
            }

            $clave = mb_strtoupper($nombreSede, 'UTF-8');
            if (!isset($sedeIdPorNombre[$clave])) {
                $sedeIdPorNombre[$clave] = ['nombre' => $nombreSede];
            }

            $nombreProyecto = self::CSV_PROYECTO_A_PROYECTOS[$proyectoCsv] ?? null;
            if ($nombreProyecto === null) {
                $this->command->warn("Proyecto \"{$proyectoCsv}\" no tiene mapeo definido, se omite para la sede \"{$nombreSede}\".");
                continue;
            }

            $proyectoId = $proyectoIds[$nombreProyecto] ?? null;
            if ($proyectoId === null) {
                $this->command->warn("Proyecto \"{$nombreProyecto}\" no existe en la tabla proyectos, se omite para la sede \"{$nombreSede}\".");
                continue;
            }

            $relaciones[] = ['sede_clave' => $clave, 'proyecto_id' => $proyectoId];
        }

        fclose($handle);

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('proyecto_sede')->truncate();
        DB::table('sedes')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $now = now();
        foreach (array_keys($sedeIdPorNombre) as $clave) {
            $id = DB::table('sedes')->insertGetId([
                'nombre'     => $sedeIdPorNombre[$clave]['nombre'],
                'estado'     => 'Activa',
                'tipo_sede'  => 'Principal',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $sedeIdPorNombre[$clave]['id'] = $id;
        }

        $pivote = collect($relaciones)
            ->map(fn ($r) => [
                'sede_id'     => $sedeIdPorNombre[$r['sede_clave']]['id'],
                'proyecto_id' => $r['proyecto_id'],
            ])
            ->unique(fn ($r) => $r['sede_id'] . '-' . $r['proyecto_id'])
            ->map(fn ($r) => $r + ['created_at' => $now, 'updated_at' => $now])
            ->values()
            ->all();

        foreach (array_chunk($pivote, 200) as $chunk) {
            DB::table('proyecto_sede')->insert($chunk);
        }

        $this->command->info('✓ ' . count($sedeIdPorNombre) . ' sedes importadas desde sedes_activas.csv (' . count($pivote) . ' relaciones proyecto-sede).');
    }
}
