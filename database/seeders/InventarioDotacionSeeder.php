<?php

namespace Database\Seeders;

use App\Models\InventarioDotacion;
use App\Models\Proyecto;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InventarioDotacionSeeder extends Seeder
{
    private const CANTIDAD_INICIAL = 20;
    private const STOCK_MINIMO_INICIAL = 0;

    // Accesorios de carnet: el nombre de origen trae variaciones/typos ("PORTA
    // CANET"), así que se normalizan a un nombre de prenda fijo en vez de usar
    // el texto tal cual viene. Siempre quedan en Unisex/N/A.
    private const PRENDA_CARNET_POR_PRIMERA_PALABRA = [
        'CARNET' => 'Carnet',
        'BRAZALETE' => 'Carnet Brazalete',
        'PORTA' => 'Carnet Porta Carnet',
        'PVC' => 'Carnet PVC',
        'YOYO' => 'Carnet Yoyo',
    ];

    // Variantes de la primera palabra que deben normalizarse a una forma
    // canónica (ej. "JEANS" y "JEAN" son la misma prenda).
    private const PRIMERA_PALABRA_NORMALIZADA = [
        'JEANS' => 'JEAN',
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
            [$prenda, $genero, $talla] = $this->parseItem($nombre);

            $key = implode('|', [$proyecto, $prenda, $genero, $talla]);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $records[] = [
                'proyecto' => $proyecto,
                'prenda' => $prenda,
                'genero' => $genero,
                'talla' => $talla,
                'precio' => $precio,
                'cantidad' => self::CANTIDAD_INICIAL,
                'stock_minimo' => self::STOCK_MINIMO_INICIAL,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        $sedeIdsPorProyecto = $this->sedeIdsPorProyectoDotacion();

        $expandido = [];
        foreach ($records as $record) {
            $sedeIds = $sedeIdsPorProyecto[$record['proyecto']] ?? [];
            if (empty($sedeIds)) {
                // Proyecto de dotación sin sedes mapeadas en proyecto_sede: se deja sin sede
                // en vez de perder el item.
                $expandido[] = $record + ['sede_id' => null];
                continue;
            }
            foreach ($sedeIds as $sedeId) {
                $expandido[] = $record + ['sede_id' => $sedeId];
            }
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('inventario_dotacion')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
        foreach (array_chunk($expandido, 500) as $chunk) {
            DB::table('inventario_dotacion')->insert($chunk);
        }

        $this->command->info('✓ ' . count($records) . ' combinaciones prenda/talla repartidas entre las sedes de cada proyecto: ' . count($expandido) . ' filas de inventario_dotacion en total.');
    }

    /**
     * Proyecto de dotación (PROYECTOS_DOTACION) => ids de sedes válidas para ese proyecto,
     * resueltos vía InventarioDotacion::PROYECTO_DOTACION_A_PROYECTO y el pivote proyecto_sede.
     */
    private function sedeIdsPorProyectoDotacion(): array
    {
        $mapa = [];
        foreach (InventarioDotacion::PROYECTO_DOTACION_A_PROYECTO as $proyectoDotacion => $nombreProyecto) {
            $proyecto = Proyecto::where('nombre', $nombreProyecto)->first();
            $mapa[$proyectoDotacion] = $proyecto ? $proyecto->sedes()->pluck('sedes.id')->all() : [];
        }
        return $mapa;
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
     * @return array{0:string,1:string,2:string} [prenda, genero, talla]
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

        $talla = 'N/A';
        if (preg_match(self::TALLA_TRAS_TEXTO, $nombre, $m)) {
            $talla = strtoupper(trim($m[0]));
            $nombre = trim(substr($nombre, 0, -strlen($m[0])));
        }

        $palabras = explode(' ', $nombre);
        $primera = strtoupper($palabras[0] ?? '');

        if (isset(self::PRENDA_CARNET_POR_PRIMERA_PALABRA[$primera])) {
            $genero = 'Unisex';
            $talla = 'N/A';
            $prenda = self::PRENDA_CARNET_POR_PRIMERA_PALABRA[$primera];
        } else {
            if (isset(self::PRIMERA_PALABRA_NORMALIZADA[$primera])) {
                $palabras[0] = self::PRIMERA_PALABRA_NORMALIZADA[$primera];
                $nombre = implode(' ', $palabras);
            }
            $prenda = $this->tituloCase($nombre);
        }

        return [$prenda, $genero, $talla];
    }

    private function tituloCase(string $texto): string
    {
        return mb_convert_case(mb_strtolower($texto), MB_CASE_TITLE, 'UTF-8');
    }
}
