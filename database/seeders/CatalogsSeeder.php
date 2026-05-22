<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CatalogsSeeder extends Seeder
{
    public function run(): void
    {
        $this->importSimple('cargos',            'Cargos.csv',           150);
        $this->importSimple('eps',               'EPS.csv',              100);
        $this->importSimple('tipos_rh',          'rh.csv',               10);
        $this->importSimple('estados_civil',     'estado_civil.csv',     60);
        $this->importSimple('empleadores',       'empleadores.csv',      150);
        $this->importSimple('bancos',            'bancos.csv',           100);
        $this->importSimple('arls',              'arl.csv',              100);
        $this->importSimple('cajas_compensacion','caja_compensasion.csv',  100);
        $this->importSimple('fondos_pensiones',  'fondos_pensiones.csv',   100);
        $this->importSimple('fondos_cesantias',  'fondos_cesantias.csv',   100);
        $this->importCiudades();
    }

    private function importSimple(string $table, string $file, int $max): void
    {
        $path = database_path("seeders/data/{$file}");
        if (!file_exists($path)) {
            $this->command->warn("No encontrado: {$file}");
            return;
        }

        DB::table($table)->truncate();

        $handle = fopen($path, 'r');
        fgetcsv($handle); // saltar cabecera

        $batch = [];
        $count = 0;

        while (($row = fgetcsv($handle)) !== false) {
            if (!isset($row[0]) || !is_numeric($row[0])) continue;

            $batch[] = [
                'id'         => (int) $row[0],
                'nombre'     => mb_substr(trim($row[1] ?? ''), 0, $max),
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $count++;

            if (count($batch) >= 100) {
                DB::table($table)->insertOrIgnore($batch);
                $batch = [];
            }
        }

        if (!empty($batch)) {
            DB::table($table)->insertOrIgnore($batch);
        }

        fclose($handle);
        $this->command->info("✓ {$count} registros en {$table}");
    }

    private function importCiudades(): void
    {
        $path = database_path('seeders/data/ciudades.csv');
        if (!file_exists($path)) {
            $this->command->warn('No encontrado: ciudades.csv');
            return;
        }

        DB::table('ciudades')->truncate();

        $handle = fopen($path, 'r');
        fgetcsv($handle); // saltar cabecera

        $batch = [];
        $count = 0;

        while (($row = fgetcsv($handle)) !== false) {
            if (!isset($row[0]) || !is_numeric($row[0])) continue;

            $batch[] = [
                'id'              => (int) $row[0],
                'nombre'          => trim($row[1] ?? ''),
                'id_departamento' => is_numeric($row[2] ?? '') ? (int)   $row[2] : null,
                'valor_flete'     => is_numeric($row[3] ?? '') ? (float) $row[3] : null,
                'codigo_dane'     => isset($row[4]) && $row[4] !== '' ? $row[4] : null,
                'codigo_dep'      => isset($row[5]) && $row[5] !== '' ? $row[5] : null,
                'codigo_ciu'      => isset($row[6]) && $row[6] !== '' ? $row[6] : null,
                'perimetro'       => isset($row[7]) && $row[7] !== '' ? $row[7] : null,
                'created_at'      => now(),
                'updated_at'      => now(),
            ];
            $count++;

            if (count($batch) >= 100) {
                DB::table('ciudades')->insertOrIgnore($batch);
                $batch = [];
            }
        }

        if (!empty($batch)) {
            DB::table('ciudades')->insertOrIgnore($batch);
        }

        fclose($handle);
        $this->command->info("✓ {$count} ciudades importadas");
    }
}
