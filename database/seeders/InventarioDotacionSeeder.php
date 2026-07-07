<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InventarioDotacionSeeder extends Seeder
{
    private const CANTIDAD_INICIAL = 20;
    private const STOCK_MINIMO_INICIAL = 0;

    private const CATEGORIA_POR_PRIMERA_PALABRA = [
        'BLUSA' => 'Blusa',
        'BOTAS' => 'Botas',
        'BRAZALETE' => 'Carnet',
        'CAMISA' => 'Camisa',
        'CARNET' => 'Carnet',
        'CHAQUETA' => 'Chaqueta',
        'CONJUNTO' => 'Conjunto',
        'GORRA' => 'Gorra',
        'JEAN' => 'Jean',
        'JEANS' => 'Jean',
        'PANTALON' => 'Pantalon',
        'POLO' => 'Polo',
        'PORTA' => 'Carnet',
        'PVC' => 'Carnet',
        'REATA' => 'Reata',
        'TENIS' => 'Tenis',
        'YOYO' => 'Carnet',
    ];

    private const SUBCATEGORIA_CARNET_POR_PALABRA = [
        'CARNET' => 'Carnet',
        'BRAZALETE' => 'Brazalete',
        'PORTA' => 'Porta Carnet',
        'PVC' => 'PVC',
        'YOYO' => 'Yoyo',
    ];

    /**
     * Import real desde el Excel de items del cliente (database/seeders/data/inventario_dotacion_import.csv).
     * Reemplaza los datos de prueba anteriores. Divide el inventario por proyecto según empresa + palabras
     * clave del nombre del item: SERVIMERCADEO -> DIRECTV; SYM con "EXPRESS"/"HOME" en el nombre -> el
     * proyecto SYM correspondiente; el resto de items SYM (sin marca de proyecto en el nombre) -> SYM Administrativo.
     */
    public function run(): void
    {
        $path = __DIR__ . '/data/inventario_dotacion_import.csv';
        $lines = array_map('str_getcsv', file($path));
        $header = array_map(fn ($h) => strtolower(trim($h)), array_shift($lines));

        $now = now();
        $records = [];
        $seen = [];

        foreach ($lines as $row) {
            if (count($row) < count($header)) {
                continue;
            }
            $data = array_combine($header, $row);
            if (trim($data['estado'] ?? '') !== 'Activo') {
                continue;
            }

            $empresa = trim($data['empresa']);
            $nombre = trim($data['item']);
            $precio = (int) $data['precio'];

            $proyecto = $this->resolverProyecto($empresa, $nombre);
            [$categoria, $subcategoria, $genero, $talla] = $this->parseItem($nombre);

            $key = implode('|', [$proyecto, $categoria, $subcategoria, $genero, $talla]);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $records[] = [
                'proyecto' => $proyecto,
                'categoria' => $categoria,
                'subcategoria' => $subcategoria,
                'genero' => $genero,
                'talla' => $talla,
                'precio' => $precio,
                'cantidad' => self::CANTIDAD_INICIAL,
                'stock_minimo' => self::STOCK_MINIMO_INICIAL,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('inventario_dotacion')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
        DB::table('inventario_dotacion')->insert($records);

        $this->command->info('✓ ' . count($records) . ' items de inventario de dotación importados desde el Excel.');
    }

    private function resolverProyecto(string $empresa, string $nombre): string
    {
        if ($empresa === 'SERVIMERCADEO') {
            return 'DIRECTV';
        }

        if (str_contains($nombre, 'EXPRESS')) {
            return 'SYM TIGO EXPRESS';
        }
        if (str_contains($nombre, 'HOME')) {
            return 'SYM TIGO HOME';
        }

        return 'SYM ADMINISTRATIVO';
    }

    private const TALLA_TRAS_TEXTO = '/\b(\d{1,2}|XS|S|M|L|XL|2XL|3XL|4XL|XXL|XXXL)(\s*\([^)]*\))?$/i';

    /**
     * @return array{0:string,1:string,2:string,3:string} [categoria, subcategoria, genero, talla]
     */
    private function parseItem(string $nombreOriginal): array
    {
        $nombre = preg_replace('/\s+/', ' ', trim($nombreOriginal));
        $nombre = preg_replace('/^SYM\s+/', '', $nombre);
        $nombre = str_replace('M/CXXXL', 'M/C XXXL', $nombre); // typo en el Excel origen (falta espacio)

        $generoPatrones = [
            'Femenino' => '/\b(FEMENINO|FEMENINA|MUJER|DAMA)\b/',
            'Masculino' => '/\b(MASCULINO|MASCULINA|HOMBRE|CABALLERO)\b/',
        ];

        $genero = 'Unisex';
        foreach ($generoPatrones as $g => $patron) {
            if (preg_match($patron, $nombre, $m, PREG_OFFSET_CAPTURE)) {
                $genero = $g;
                $pos = $m[0][1];
                $largo = strlen($m[0][0]);
                $antes = rtrim(substr($nombre, 0, $pos));
                $despues = ltrim(substr($nombre, $pos + $largo));
                $nombre = trim($antes . ' ' . $despues);
                break;
            }
        }

        $talla = 'Única';
        if (preg_match(self::TALLA_TRAS_TEXTO, $nombre, $m)) {
            $talla = strtoupper(trim($m[0]));
            $nombre = trim(substr($nombre, 0, -strlen($m[0])));
        }

        $palabras = explode(' ', $nombre);
        $primera = strtoupper($palabras[0] ?? '');
        $categoria = self::CATEGORIA_POR_PRIMERA_PALABRA[$primera] ?? 'Otro';

        if ($categoria === 'Carnet') {
            $subcategoria = self::SUBCATEGORIA_CARNET_POR_PALABRA[$primera] ?? 'Carnet';
            $genero = 'Unisex';
            $talla = 'Única';
        } else {
            $resto = trim(implode(' ', array_slice($palabras, 1)));
            $subcategoria = $this->tituloCase($resto !== '' ? $resto : $primera);
        }

        return [$categoria, $subcategoria, $genero, $talla];
    }

    private function tituloCase(string $texto): string
    {
        return mb_convert_case(mb_strtolower($texto), MB_CASE_TITLE, 'UTF-8');
    }
}
