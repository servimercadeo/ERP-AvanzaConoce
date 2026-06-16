<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InventarioDotacionSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('inventario_dotacion')->truncate();

        $now = now();

        $grupos = [
            ['Polo', 'Manga Corta', 'Masculino', 20, ['XS' => 5, 'S' => 12, 'M' => 28, 'L' => 35, 'XL' => 20, 'XXL' => 8, 'XXXL' => 3]],
            ['Polo', 'Manga Corta', 'Femenino', 15, ['XS' => 8, 'S' => 18, 'M' => 30, 'L' => 22, 'XL' => 14, 'XXL' => 4, 'XXXL' => 1]],
            ['Polo', 'Manga Larga', 'Masculino', 10, ['XS' => 2, 'S' => 6, 'M' => 15, 'L' => 20, 'XL' => 12, 'XXL' => 5, 'XXXL' => 2]],
            ['Polo', 'Manga Larga', 'Femenino', 10, ['XS' => 4, 'S' => 10, 'M' => 18, 'L' => 14, 'XL' => 8, 'XXL' => 3, 'XXXL' => 1]],
            ['Jean', 'Clásico', 'Masculino', 25, ['26' => 2, '28' => 8, '30' => 20, '32' => 35, '34' => 28, '36' => 15, '38' => 6, '40' => 3]],
            ['Jean', 'Clásico', 'Femenino', 20, ['26' => 5, '28' => 15, '30' => 25, '32' => 20, '34' => 12, '36' => 6, '38' => 2, '40' => 1]],
            ['Chaqueta', 'Impermeable', 'Masculino', 15, ['XS' => 3, 'S' => 10, 'M' => 22, 'L' => 30, 'XL' => 18, 'XXL' => 8, 'XXXL' => 2]],
            ['Chaqueta', 'Impermeable', 'Femenino', 12, ['XS' => 6, 'S' => 14, 'M' => 24, 'L' => 18, 'XL' => 10, 'XXL' => 4, 'XXXL' => 1]],
            ['Chaqueta', 'Reflectiva', 'Masculino', 10, ['XS' => 2, 'S' => 8, 'M' => 16, 'L' => 22, 'XL' => 14, 'XXL' => 6, 'XXXL' => 2]],
            ['Chaqueta', 'Reflectiva', 'Femenino', 8, ['XS' => 4, 'S' => 10, 'M' => 18, 'L' => 14, 'XL' => 8, 'XXL' => 3, 'XXXL' => 1]],
            ['Tenis', 'Seguridad', 'Masculino', 30, ['34' => 2, '35' => 4, '36' => 8, '37' => 12, '38' => 20, '39' => 28, '40' => 30, '41' => 22, '42' => 14, '43' => 8, '44' => 4, '45' => 2]],
            ['Tenis', 'Seguridad', 'Femenino', 20, ['34' => 4, '35' => 8, '36' => 16, '37' => 22, '38' => 28, '39' => 20, '40' => 12, '41' => 6, '42' => 3, '43' => 1, '44' => 0, '45' => 0]],
            ['Tenis', 'Casual', 'Masculino', 25, ['34' => 3, '35' => 6, '36' => 12, '37' => 18, '38' => 25, '39' => 30, '40' => 28, '41' => 20, '42' => 12, '43' => 6, '44' => 3, '45' => 1]],
            ['Tenis', 'Casual', 'Femenino', 20, ['34' => 6, '35' => 12, '36' => 22, '37' => 28, '38' => 30, '39' => 22, '40' => 14, '41' => 8, '42' => 4, '43' => 2, '44' => 0, '45' => 0]],
        ];

        $records = [];
        foreach ($grupos as [$categoria, $subcategoria, $genero, $stockMinimo, $tallas]) {
            foreach ($tallas as $talla => $cantidad) {
                $records[] = [
                    'categoria' => $categoria,
                    'subcategoria' => $subcategoria,
                    'genero' => $genero,
                    'talla' => (string) $talla,
                    'cantidad' => $cantidad,
                    'stock_minimo' => $stockMinimo,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        DB::table('inventario_dotacion')->insert($records);

        $this->command->info('✓ ' . count($records) . ' registros de inventario de dotación insertados.');
    }
}
