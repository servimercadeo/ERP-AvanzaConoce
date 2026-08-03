<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Segundo reemplazo del catálogo de centros de costo, con el listado real
     * (código + nombre de sede/descripción) provisto por el usuario, que corrige
     * el listado cargado por la migración anterior (2026_07_30_000001).
     * "ciudad" aquí guarda el nombre descriptivo completo de la sede, no solo la
     * ciudad, tal como se usa en el resto del catálogo.
     */
    private const FILAS = [
        // codigo, ciudad(=nombre descriptivo de sede), proyecto, nombre(=operacion)
        ['210102',  'COMERCIAL NACIONAL', 'Hughes Net', 'Comercial'],
        ['2101031', 'OPERACIÓN NACIONAL', 'Hughes Net', 'Operaciones'],

        ['220102', 'TIGO EXPRESS PEREIRA CALLE 19 CON 8', 'Tigo express PDV', 'Comercial'],
        ['220103', 'TIGO EXPRESS PEREIRA EXITO CUBA', 'Tigo express PDV', 'Comercial'],
        ['220120', 'TIGO EXPRESS LA VIRGINIA CR 8 7 23 CENTRO', 'Tigo express PDV', 'Comercial'],
        ['220160', 'TIGO EXPRESS SANTA ROSA DE CABAL CLL 14', 'Tigo express PDV', 'Comercial'],
        ['220302', 'TIGO EXPRESS CALI CR 4 14', 'Tigo express PDV', 'Comercial'],
        ['220502', 'TIGO EXPRESS MANIZALES CR 23 #26-27', 'Tigo express PDV', 'Comercial'],
        ['220503', 'TIGO EXPRESS MANIZALES CLL 18 23-04 ESQUINA', 'Tigo express PDV', 'Comercial'],
        ['220504', 'TIGO EXPRESS CHINCHINA CLL 12 8-12', 'Tigo express PDV', 'Comercial'],
        ['220601', 'TIGO EXPRESS MEDELLIN 01 LAS AMERICAS', 'Tigo express PDV', 'Comercial'],
        ['220602', 'TIGO EXPRESS MEDELLIN 02 BELEN', 'Tigo express PDV', 'Comercial'],
        ['220604', 'TIGO EXPRESS LA CEJA CLL 19 19-103', 'Tigo express PDV', 'Comercial'],
        ['220605', 'TIGO EXPRESS ITAGUI CENTRO COMERCIAL CL 50 48', 'Tigo express PDV', 'Comercial'],
        ['220608', 'TIGO EXPRESS CALDAS ANTIOQUIA', 'Tigo express PDV', 'Comercial'],
        ['220609', 'TIGO EXPRESS MARINILLA CR 30 32-09 ESQUINA PARQUE', 'Tigo express PDV', 'Comercial'],
        ['220610', 'TIGO EXPRESS GUARNE CRA 51 51-12', 'Tigo express PDV', 'Comercial'],
        ['220611', 'TIGO EXPRESS RIONEGRO CLL 51 48-52', 'Tigo express PDV', 'Comercial'],
        ['220701', 'TIGO EXPRESS ITAGUI 01CENTRO PQ', 'Tigo express PDV', 'Comercial'],
        ['220702', 'TIGO EXPRESS ITAGUI 02 CR 58 D CENTRO DE LA MODA', 'Tigo express PDV', 'Comercial'],
        ['220706', 'TIGO EXPRESS BOGOTA CLL 163A SAN CRISTOBAL', 'Tigo express PDV', 'Comercial'],
        ['220707', 'TIGO EXPRESS BOGOTA BOSA BRASIL', 'Tigo express PDV', 'Comercial'],
        ['220716', 'TIGO EXPRESS BOGOTA CL 37 SUR CENTRO KENNEDY', 'Tigo express PDV', 'Comercial'],
        ['220717', 'TIGO EXPRESS BOGOTA VENECIA', 'Tigo express PDV', 'Comercial'],
        ['220718', 'TIGO EXPRESS BOGOTA AV CR 80 KENNEDY ROMA', 'Tigo express PDV', 'Comercial'],
        ['220719', 'TIGO EXPRESS SOACHA CLL 15 LAS VILLAS', 'Tigo express PDV', 'Comercial'],
        ['220720', 'TIGO EXPRESS BOGOTA SANTA LIBRADA', 'Tigo express PDV', 'Comercial'],
        ['220727', 'TIGO EXPRESS FACATATIVA CALLE 5 NRO 2-74 CENTRO', 'Tigo express PDV', 'Comercial'],
        ['220737', 'TIGO EXPRESS FUSAGASUGA KR 5 9-45', 'Tigo express PDV', 'Comercial'],
        ['220747', 'TIGO ESPRESS MADRID CRA 7 7-51', 'Tigo express PDV', 'Comercial'],
        ['220757', 'TIGO EXPRESS BOGOTA 61B-08 SAN FRANCISCO', 'Tigo express PDV', 'Comercial'],
        ['220767', 'TIGO EXPRESS GIRARDOT CR 11 18-50', 'Tigo express PDV', 'Comercial'],
        ['220768', 'TIGO EXPRESS BOGOTA CLL 64 ENGATIVA', 'Tigo express PDV', 'Comercial'],
        ['220801', 'TIGO EXPRESS BUCARAMANGA CABECERA', 'Tigo express PDV', 'Comercial'],
        ['220802', 'TIGO EXPRESS BARRANCABERMEJA (CR 8 N 6 10 LC 113 CC CITY)', 'Tigo express PDV', 'Comercial'],
        ['220803', 'TIGO EXPRESS FLORIDABLANCA CLL 5 PLAZA CENTRAL', 'Tigo express PDV', 'Comercial'],
        ['220805', 'TIGO EXPRESS FLORIDABLANCA 6AE-80 BR LA CUMBRE', 'Tigo express PDV', 'Comercial'],
        ['220811', 'TIGO EXPRESS BUCARAMANGA CENTRO', 'Tigo express PDV', 'Comercial'],
        ['220813', 'TIGO EXPRESS VILLA DEL ROSARIO CRA 8 5-15', 'Tigo express PDV', 'Comercial'],
        ['220814', 'TIGO EXPRESS VILLA DEL ROSARIO CR 8 5 11', 'Tigo express PDV', 'Comercial'],
        ['220902', 'TIGO EXPRESS BARANOA CRA 19 17-28 PLAZA CENTRO', 'Tigo express PDV', 'Comercial'],
        ['220903', 'TIGO EXPRESS GALAPA CLL 10 21-53 CENTRO', 'Tigo express PDV', 'Comercial'],
        ['220904', 'TIGO EXPRESS SOLEDAD CLL 20 19-02', 'Tigo express PDV', 'Comercial'],
        ['220905', 'TIGO EXPRESS MALAMBO CLL 10 12 16 CENTRO', 'Tigo express PDV', 'Comercial'],
        ['221001', 'TIGO EXPRESS CARTAGENA LOS EJECUTIVOS LC 37', 'Tigo express PDV', 'Comercial'],
        ['221002', 'TIGO EXPRESS CARTAGENA BAZURTO 27A-26', 'Tigo express PDV', 'Comercial'],
        ['221203', 'TIGO EXPRESS SINCELEJO CLL 20 20 63 CENTRO', 'Tigo express PDV', 'Comercial'],
        ['221501', 'TIGO EXPRESS CUCUTA CLL 10 1-11 LA PLAYA', 'Tigo express PDV', 'Comercial'],
        ['221502', 'TIGO EXPRESS CUCUTA AV 3 9-70', 'Tigo express PDV', 'Comercial'],
        ['221503', 'TIGO EXPRESS CUCUTA AV 8 7-89 CENTRO', 'Tigo express PDV', 'Comercial'],
        ['221901', 'TIGO EXPRESS VALLEDUPAR CRA 7 16A-78 LC 2', 'Tigo express PDV', 'Comercial'],
        ['222102', 'TIGO EXPRESS NACIONAL', 'Tigo express PDV', 'Comercial'],
        ['221204', 'TIGO EXPRESS CERETE 13 14-09 LOS ALMENDROS', 'Tigo express PDV', 'Comercial'],
        ['221003', 'TIGO CARTAGENA AV VENEZUELA 1A 42', 'Tigo express PDV', 'Comercial'],
        ['220906', 'TIGO EXPRESS BARRANQUILLA LC 11B CC JARDIN DEL RIO', 'Tigo express PDV', 'Comercial'],
        ['220607', 'TIGO VILLA MARIA -CALDAS CR5 17 13', 'Tigo express PDV', 'Comercial'],
        ['220606', 'TIGO EXPRESS BELLO CLL 49 50-10', 'Tigo express PDV', 'Comercial'],
        ['220612', 'TIGO SAN ANTONIO DE PRADO', 'Tigo express PDV', 'Comercial'],
        ['220708', 'TIGO EXPRESS BOGOTA AC 145 103B-80 SUBA', 'Tigo express PDV', 'Comercial'],
        ['220806', 'TIGO EXPRESS CAJICA CRA 5 1-98', 'Tigo express PDV', 'Comercial'],
        ['220907', 'TIGO EXPRESS LA PAZ CR 13 99D 07', 'Tigo express PDV', 'Comercial'],
        ['220101', '', 'Tigo express PDV', 'Comercial'],
        ['220613', '', 'Tigo express PDV', 'Comercial'],
        ['220703', 'REG CENTRO TIGO EXPRESS FDV', 'Tigo express PDV', 'Comercial'],
        ['220901', '', 'Tigo express PDV', 'Comercial'],
        ['220704', 'TIGO EXPRESS BOGOTA CRA 18 21 05 RESTREPO', 'Tigo express PDV', 'Comercial'],
        ['221004', 'TIGO EXPRESS ARJONA 51 48 CLL DEL COCO', 'Tigo express PDV', 'Comercial'],
        ['221205', 'TIGO EXPRESS TOLU CRA 3 N 14 35', 'Tigo express PDV', 'Comercial'],
        ['220769', 'TIGO ORIENTE PDV', 'Tigo express PDV', 'Comercial'],
        ['220815', '', 'Tigo express PDV', 'Comercial'],

        ['220690', 'TIGO HOME MEDELLIN', 'Tigo FDV Home', 'Comercial'],
        ['220990', 'TIGO HOME BARRANQUILLA', 'Tigo FDV Home', 'Comercial'],
        ['221090', 'TIGO HOME CARTAGENA', 'Tigo FDV Home', 'Comercial'],
        ['221201', 'TIGO HOME MONTERIA', 'Tigo FDV Home', 'Comercial'],
        ['221202', 'TIGO HOME SINCELEJO', 'Tigo FDV Home', 'Comercial'],
        ['221903', 'TIGO HOME VALLEDUPAR', 'Tigo FDV Home', 'Comercial'],
        ['222190', 'TIGO NACIONAL HOME', 'Tigo FDV Home', 'Comercial'],
        ['220100', '', 'Tigo FDV Home', 'Comercial'],
        ['220900', '', 'Tigo FDV Home', 'Comercial'],
        ['220600', '', 'Tigo FDV Home', 'Comercial'],
        ['220700', 'REG CENTRO TIGO HOME PDV', 'Tigo FDV Home', 'Comercial'],

        ['000001', 'Administracion central', 'Administración', 'Administración'],
        ['000005', 'REINTEGRO SERVIMERCADEO', 'Servimercadeo', 'Servimercadeo'],
    ];

    public function up(): void
    {
        DB::table('centros_costo_catalogo')->delete();

        $now = now();
        $rows = array_map(fn ($fila) => [
            'codigo'     => $fila[0],
            'ciudad'     => $fila[1] !== '' ? $fila[1] : null,
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
