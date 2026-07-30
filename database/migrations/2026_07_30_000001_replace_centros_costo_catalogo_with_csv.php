<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Reemplaza el catálogo de centros de costo por el listado provisto en
     * centros-de-costos-_1_.csv (columnas: cc, ciudad, proyecto, operacion).
     * El CSV no trae un nombre descriptivo por sede, así que "nombre" toma el
     * valor de "operacion" (Comercial/Operaciones/Administración/Servimercadeo),
     * tal como está en el archivo fuente. Se corrigen únicamente artefactos de
     * codificación del CSV (p.ej. "BogotÃ¡" -> "Bogotá", "AdministraciÃ³n" -> "Administración").
     */
    private const FILAS = [
        // codigo, ciudad, proyecto, nombre(=operacion)
        ['010102', 'Pereira', 'Hughes Net', 'Comercial'],
        ['0101031', 'Pereira', 'Hughes Net', 'Operaciones'],
        ['030102', 'Cali', 'Hughes Net', 'Comercial'],
        ['0301031', 'Cali', 'Hughes Net', 'Operaciones'],
        ['030202', 'Tulua', 'Hughes Net', 'Comercial'],
        ['0302031', 'Tulua', 'Hughes Net', 'Operaciones'],
        ['040102', 'Ibague', 'Hughes Net', 'Comercial'],
        ['0401031', 'Ibague', 'Hughes Net', 'Operaciones'],
        ['060102', 'Medellin', 'Hughes Net', 'Comercial'],
        ['0601031', 'Medellin', 'Hughes Net', 'Operaciones'],
        ['060202', 'Rionegro', 'Hughes Net', 'Comercial'],
        ['0602031', 'Rionegro', 'Hughes Net', 'Operaciones'],
        ['060302', 'Apartado', 'Hughes Net', 'Comercial'],
        ['0603031', 'Apartado', 'Hughes Net', 'Operaciones'],
        ['070101', 'Bogota', 'Hughes Net', 'Administración'],
        ['070102', 'Bogota', 'Hughes Net', 'Comercial'],
        ['0701031', 'Bogota', 'Hughes Net', 'Operaciones'],
        ['070202', 'Villavicencio', 'Hughes Net', 'Comercial'],
        ['0702031', 'Villavicencio', 'Hughes Net', 'Operaciones'],
        ['080102', 'Bucaramanga', 'Hughes Net', 'Comercial'],
        ['0801031', 'Bucaramanga', 'Hughes Net', 'Operaciones'],
        ['090102', 'Barranquilla', 'Hughes Net', 'Comercial'],
        ['0901031', 'Barranquilla', 'Hughes Net', 'Operaciones'],
        ['100102', 'Cartagena', 'Hughes Net', 'Comercial'],
        ['1001031', 'Cartagena', 'Hughes Net', 'Operaciones'],
        ['110102', 'Pasto', 'Hughes Net', 'Comercial'],
        ['1101031', 'Pasto', 'Hughes Net', 'Operaciones'],
        ['120102', 'Monteria', 'Hughes Net', 'Comercial'],
        ['1201031', 'Monteria', 'Hughes Net', 'Operaciones'],
        ['130102', 'Santa Marta', 'Hughes Net', 'Comercial'],
        ['1301031', 'Santa Marta', 'Hughes Net', 'Operaciones'],
        ['140102', 'Tunja', 'Hughes Net', 'Comercial'],
        ['1401031', 'Tunja', 'Hughes Net', 'Operaciones'],
        ['150102', 'Cucuta', 'Hughes Net', 'Comercial'],
        ['1501031', 'Cucuta', 'Hughes Net', 'Operaciones'],
        ['1502', 'tibu', 'Hughes Net', 'Comercial'],
        ['160102', 'Popayan', 'Hughes Net', 'Comercial'],
        ['1601031', 'Popayan', 'Hughes Net', 'Operaciones'],
        ['210102', 'Nacional comercial hughes', 'Hughes Net', 'Comercial'],
        ['2101031', 'Nacional inst hughes', 'Hughes Net', 'Operaciones'],
        ['220102', 'Pereira Calle 19 con 8', 'Tigo express PDV', 'Comercial'],
        ['220103', 'Pereira éxito cuba', 'Tigo express PDV', 'Comercial'],
        ['220120', 'La Virginia', 'Tigo express PDV', 'Comercial'],
        ['220160', 'Santa Rosa de Cabal', 'Tigo express PDV', 'Comercial'],
        ['220302', 'Cali cra 4 14', 'Tigo express PDV', 'Comercial'],
        ['220502', 'Manizales', 'Tigo express PDV', 'Comercial'],
        ['220503', 'Manizales Esquina', 'Tigo express PDV', 'Comercial'],
        ['220504', 'Chinchina', 'Tigo express PDV', 'Comercial'],
        ['220601', 'Medellin Las Americas', 'Tigo express PDV', 'Comercial'],
        ['220602', 'Medellin Belen', 'Tigo express PDV', 'Comercial'],
        ['220604', 'La Ceja', 'Tigo express PDV', 'Comercial'],
        ['220605', 'Itagui Centro Comercial', 'Tigo express PDV', 'Comercial'],
        ['220608', 'Medellin Caldas', 'Tigo express PDV', 'Comercial'],
        ['220609', 'Marinilla', 'Tigo express PDV', 'Comercial'],
        ['220610', 'Guarne Cr 51 Cl 51 12', 'Tigo express PDV', 'Comercial'],
        ['220611', 'Rionegro', 'Tigo express PDV', 'Comercial'],
        ['220701', 'Itagui Parque Centro', 'Tigo express PDV', 'Comercial'],
        ['220702', 'Itagui Centro de la moda', 'Tigo express PDV', 'Comercial'],
        ['220706', 'Bogotá san cristobal', 'Tigo express PDV', 'Comercial'],
        ['220707', 'Bogota Bosa Brasil', 'Tigo express PDV', 'Comercial'],
        ['220716', 'Bogota Kenedy Centro', 'Tigo express PDV', 'Comercial'],
        ['220717', 'Bogotá Venecia', 'Tigo express PDV', 'Comercial'],
        ['220718', 'Bogota Kenedy', 'Tigo express PDV', 'Comercial'],
        ['220719', 'Soacha', 'Tigo express PDV', 'Comercial'],
        ['220720', 'Santa Librada Bogota', 'Tigo express PDV', 'Comercial'],
        ['220727', 'Facatativa', 'Tigo express PDV', 'Comercial'],
        ['220737', 'Fusagasuga', 'Tigo express PDV', 'Comercial'],
        ['220747', 'Madrid Cundinamarca', 'Tigo express PDV', 'Comercial'],
        ['220757', 'Bogota San Francisco', 'Tigo express PDV', 'Comercial'],
        ['220767', 'Girardot', 'Tigo express PDV', 'Comercial'],
        ['220768', 'Bogota Engativa', 'Tigo express PDV', 'Comercial'],
        ['220801', 'Bucaramanga Cra 33 44-76', 'Tigo express PDV', 'Comercial'],
        ['220802', 'Barrancabermeja ccial city', 'Tigo express PDV', 'Comercial'],
        ['220803', 'Floridablanca Plaza Central', 'Tigo express PDV', 'Comercial'],
        ['220805', 'Bucaramanga La Cumbre', 'Tigo express PDV', 'Comercial'],
        ['220811', 'Bucaramanga Cabecera Centro', 'Tigo express PDV', 'Comercial'],
        ['220812', 'Girardot', 'Tigo express PDV', 'Comercial'],
        ['220813', 'Villa del Rosario Norte Sant.', 'Tigo express PDV', 'Comercial'],
        ['220814', 'Villa del Rosario Norte Sant.', 'Tigo express PDV', 'Comercial'],
        ['220902', 'Baranoa', 'Tigo express PDV', 'Comercial'],
        ['220903', 'Galapa Cl 10 21-53', 'Tigo express PDV', 'Comercial'],
        ['220904', 'Soledad - American Bar', 'Tigo express PDV', 'Comercial'],
        ['220905', 'Malambo', 'Tigo express PDV', 'Comercial'],
        ['221001', 'Cartagena cll 31', 'Tigo express PDV', 'Comercial'],
        ['221002', 'Cartagena Bazurto', 'Tigo express PDV', 'Comercial'],
        ['221203', 'Sincelejo Express', 'Tigo express PDV', 'Comercial'],
        ['221501', 'Cucuta La Playa', 'Tigo express PDV', 'Comercial'],
        ['221502', 'Cucuta Av 3', 'Tigo express PDV', 'Comercial'],
        ['221503', 'Cucuta Av 8 Centro', 'Tigo express PDV', 'Comercial'],
        ['221901', 'Valledupar Cr 7', 'Tigo express PDV', 'Comercial'],
        ['222102', 'Nacional Express PDV', 'Tigo express PDV', 'Comercial'],
        ['221204', 'Tigo Cerete', 'Tigo express PDV', 'Comercial'],
        ['221003', 'Tigo Cartagena AV Venezuela', 'Tigo express PDV', 'Comercial'],
        ['220906', 'Tigo Alameda Cl 14 42  c 33', 'Tigo express PDV', 'Comercial'],
        ['220607', 'Tigo Villa Maria-Caldas Cr 5 17 13', 'Tigo express PDV', 'Comercial'],
        ['220606', 'Tigo Bello Calle 49 50 10', 'Tigo express PDV', 'Comercial'],
        ['220612', 'Tigo San Antonio de Prado', 'Tigo express PDV', 'Comercial'],
        ['220708', 'Tigo Transmilenio-Suba', 'Tigo express PDV', 'Comercial'],
        ['220806', 'Tigo Cajica CR 5 1 98', 'Tigo express PDV', 'Comercial'],
        ['220907', 'Tigo La Paz Cr 13 99D 07', 'Tigo express PDV', 'Comercial'],
        ['220101', 'Regional Sur', 'Tigo express PDV', 'Comercial'],
        ['220613', 'Regional Andina', 'Tigo express PDV', 'Comercial'],
        ['220703', 'Regional Centro', 'Tigo express PDV', 'Comercial'],
        ['220901', 'Regional Norte', 'Tigo express PDV', 'Comercial'],
        ['220704', 'Tigo Sur Restrepo Cr 18 21-05', 'Tigo express PDV', 'Comercial'],
        ['221004', 'Tigo Arjona Cr 41 49 n 51 48 calle el Coco', 'Tigo express PDV', 'Comercial'],
        ['221205', 'Tigo Tolu Cr 3 N 14 35', 'Tigo express PDV', 'Comercial'],
        ['220769', 'Tigo Oriente', 'Tigo express PDV', 'Comercial'],
        ['220815', 'Regional oriente', 'Tigo express PDV', 'Comercial'],
        ['220690', 'Medellin Home', 'Tigo FDV Home', 'Comercial'],
        ['220990', 'Barranquilla Home', 'Tigo FDV Home', 'Comercial'],
        ['221090', 'Cartagena Home', 'Tigo FDV Home', 'Comercial'],
        ['221201', 'Monteria Home', 'Tigo FDV Home', 'Comercial'],
        ['221202', 'Sincelejo Home', 'Tigo FDV Home', 'Comercial'],
        ['221903', 'Tigo Home Valledupar', 'Tigo FDV Home', 'Comercial'],
        ['222190', 'Nacional Home', 'Tigo FDV Home', 'Comercial'],
        ['220100', 'Regional home Occidente', 'Tigo FDV Home', 'Comercial'],
        ['220900', 'Regional home Norte', 'Tigo FDV Home', 'Comercial'],
        ['220600', 'Regional homeAndina', 'Tigo FDV Home', 'Comercial'],
        ['220700', 'Regional home Centro', 'Tigo FDV Home', 'Comercial'],
        ['000001', 'Administración central', 'Administración', 'Administración'],
        ['000002', 'Administración central', 'Administración', 'Administración'],
        ['000005', 'Servimercadeo', 'Servimercadeo', 'Servimercadeo'],
        ['000009', 'Administración central', 'Administración', 'Administración'],
    ];

    public function up(): void
    {
        DB::table('centros_costo_catalogo')->delete();

        $now = now();
        $rows = array_map(fn ($fila) => [
            'codigo'     => $fila[0],
            'ciudad'     => $fila[1],
            'proyecto'   => $fila[2],
            'nombre'     => $fila[3],
            'activo'     => true,
            'created_at' => $now,
            'updated_at' => $now,
        ], self::FILAS);

        foreach (array_chunk($rows, 50) as $chunk) {
            DB::table('centros_costo_catalogo')->insert($chunk);
        }
    }

    public function down(): void
    {
        // No reversible: reemplaza por completo los datos del catálogo anterior.
        DB::table('centros_costo_catalogo')->delete();
    }
};
