<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SedesSeeder extends Seeder
{
    public function run(): void
    {
        $csvPath = database_path('seeders/data/Sedes.csv');

        if (!file_exists($csvPath)) {
            $this->command->error("CSV no encontrado en: {$csvPath}");
            $this->command->line('Coloca el archivo Aliados.csv en database/seeders/data/');
            return;
        }

        $handle = fopen($csvPath, 'r');
        fgetcsv($handle); // saltar cabecera

        $nullOrVal = fn($v) => ($v === '' || strtoupper((string) $v) === 'NULL' || $v === '-') ? null : $v;
        $intOrZero = fn($v) => is_numeric($v) ? (int) $v : 0;

        $updateCols = [
            'nombre', 'id_ciudad', 'direccion', 'telefono', 'estado',
            'id_consultor_mac', 'id_almacenista_mac', 'id_secretaria_mac',
            'id_jefe_mac', 'id_user_mac', 'id_torre_mac',
            'codigo_distribuidor', 'codigo_instalador',
            'numero_contrato_inicial', 'numero_contrato_final',
            'meta_prepago', 'meta_postpago', 'tipo_sede', 'id_sede_padre',
            'sub_canal', 'updated_at',
        ];

        $batch = [];
        $count = 0;

        while (($row = fgetcsv($handle)) !== false) {
            if (!isset($row[0]) || !is_numeric($row[0])) continue;

            $batch[] = [
                'id'                      => (int) $row[0],
                'nombre'                  => trim($row[1] ?? ''),
                'id_ciudad'               => is_numeric($row[2] ?? '') ? (int) $row[2] : null,
                'direccion'               => $nullOrVal($row[3] ?? null),
                'telefono'                => $nullOrVal($row[4] ?? null),
                'estado'                  => $row[5] ?? 'Activa',
                'id_consultor_mac'        => $intOrZero($row[6] ?? 0),
                'id_almacenista_mac'      => $intOrZero($row[7] ?? 0),
                'id_secretaria_mac'       => $intOrZero($row[8] ?? 0),
                'id_jefe_mac'             => $intOrZero($row[9] ?? 0),
                'id_user_mac'             => $intOrZero($row[10] ?? 0),
                'id_torre_mac'            => $intOrZero($row[11] ?? 0),
                'codigo_distribuidor'     => $nullOrVal($row[12] ?? null),
                'codigo_instalador'       => $nullOrVal($row[13] ?? null),
                'numero_contrato_inicial' => $nullOrVal($row[14] ?? null),
                'numero_contrato_final'   => $nullOrVal($row[15] ?? null),
                'meta_prepago'            => $intOrZero($row[16] ?? 0),
                'meta_postpago'           => $intOrZero($row[17] ?? 0),
                'tipo_sede'               => $row[18] ?? 'Principal',
                'id_sede_padre'           => $intOrZero($row[19] ?? 0),
                'sub_canal'               => $nullOrVal($row[20] ?? null),
                'created_at'              => now(),
                'updated_at'              => now(),
            ];

            $count++;

            // Upsert en lotes de 50: inserta nuevas y actualiza existentes por id
            if (count($batch) >= 50) {
                DB::table('sedes')->upsert($batch, ['id'], $updateCols);
                $batch = [];
            }
        }

        if (!empty($batch)) {
            DB::table('sedes')->upsert($batch, ['id'], $updateCols);
        }

        fclose($handle);

        $this->command->info("✓ {$count} sedes importadas desde Aliados.csv");
    }
}
