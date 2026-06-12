<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DotacionesSeeder extends Seeder
{
    public function run(): void
    {
        $csvPath = database_path('seeders/data/dotaciones_tigo.csv');

        if (!file_exists($csvPath)) {
            $this->command->error("CSV no encontrado en: {$csvPath}");
            return;
        }

        $handle = fopen($csvPath, 'r');
        $headers = fgetcsv($handle);
        $batch = [];
        $count = 0;
        $now = now();

        $nullableDate = function ($value) {
            $v = trim((string) $value);
            if ($v === '') return null;
            // Intentar parsear formatos comunes: Y-m-d, d/m/Y, m/d/Y
            foreach (['Y-m-d', 'd/m/Y', 'm/d/Y', 'd-m-Y'] as $fmt) {
                $d = \DateTime::createFromFormat($fmt, $v);
                if ($d && $d->format($fmt) === $v) {
                    return $d->format('Y-m-d');
                }
            }
            // strtotime como fallback (maneja "2024-01-15", "01/15/2024", etc.)
            $ts = strtotime($v);
            if ($ts !== false && $ts > 0) {
                return date('Y-m-d', $ts);
            }
            return null; // valor no parseable → null
        };
        $nullableInt = fn($value) => is_numeric($value) ? (int) $value : null;
        $maxLen = [
            'sede' => 180, 'cedula' => 30, 'nombres' => 150, 'apellidos' => 150,
            'cargo' => 150, 'tipo_contrato' => 80, 'proceso' => 80,
            'estado_contrato' => 80, 'empleador' => 150, 'proyecto' => 120,
            'genero' => 30, 'ciudad' => 120,
            'polo_masculino_talla' => 20, 'polo_femenino_talla' => 20,
            'jean_masculino_talla' => 20, 'jean_femenino_talla' => 20,
            'chaqueta_masculino_talla' => 20, 'chaqueta_femenino_talla' => 20,
            'tenis_masculino_talla' => 20, 'tenis_femenino_talla' => 20,
            'estado_acta' => 40, 'actas_sept' => 40,
            'pedido_inicial' => 50,
            'pedido_renovacion_1' => 50, 'fecha_renovacion_1' => 80,
            'pedido_renovacion_2' => 50, 'fecha_renovacion_2' => 80,
            'pedido_renovacion_3' => 50, 'fecha_renovacion_3' => 80,
            'pedido_renovacion_4' => 50, 'fecha_renovacion_4' => 80,
            'pedido_renovacion_5' => 50, 'fecha_renovacion_5' => 80,
        ];

        $nullableString = function ($value, $column = null) use ($maxLen) {
            $v = trim((string) $value);
            if ($v === '') return null;
            if ($column && isset($maxLen[$column])) {
                $v = mb_substr($v, 0, $maxLen[$column]);
            }
            return $v;
        };

        $dateColumns = [
            'fecha_ingreso',
            'fecha_segunda_renovacion_2025',
            'fecha_primera_renovacion_2024',
            'fecha_segunda_renovacion_2024',
            'fecha_tercera_renovacion_2024',
            'fecha_primera_renovacion_2025',
            'fecha_inicial',
        ];

        $intColumns = [
            'polo_masculino_cantidad',
            'polo_femenino_cantidad',
            'jean_masculino_cantidad',
            'jean_femenino_cantidad',
            'chaqueta_masculino_cantidad',
            'chaqueta_femenino_cantidad',
            'tenis_masculino_cantidad',
            'tenis_femenino_cantidad',
        ];

        while (($row = fgetcsv($handle)) !== false) {
            if (count(array_filter($row, fn($value) => trim((string) $value) !== '')) === 0) {
                continue;
            }

            $record = array_combine($headers, $row);
            foreach ($record as $key => $value) {
                if (in_array($key, $dateColumns, true)) {
                    $record[$key] = $nullableDate($value);
                } elseif (in_array($key, $intColumns, true)) {
                    $record[$key] = $nullableInt($value);
                } else {
                    $record[$key] = $nullableString($value, $key);
                }
            }

            $record['created_at'] = $now;
            $record['updated_at'] = $now;
            $batch[] = $record;
            $count++;

            if (count($batch) >= 200) {
                DB::table('dotaciones')->insert($batch);
                $batch = [];
            }
        }

        if (!empty($batch)) {
            DB::table('dotaciones')->insert($batch);
        }

        fclose($handle);

        $this->command->info("✓ {$count} registros de dotación importados desde Inventario de Tigo.xlsx");
    }
}
