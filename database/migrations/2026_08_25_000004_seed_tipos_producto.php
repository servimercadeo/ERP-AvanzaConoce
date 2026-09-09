<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $nombres = [
            "ACCESORIOS", "ACTIVOS", "AMARRAS", "AMARRES Y GRAPAS", "CABLE INTERNET",
            "CABLE TELEVISION", "CELULAR HUAWEI G610", "CELULARES", "CINTA NEGRA",
            "CONECTORES", "DESCANSA PIES", "DOTACION", "DOTACION COMERCIAL",
            "DOTACION CYC", "DTV- ANTENA", "DTV- MDU", "DTV- NET", "DTV- NEXUS",
            "DTV- SERIALIZADOS", "EPP", "EQUIPO HUAWEI ONT 2.4", "EQUIPOS DE COMPUTO",
            "EQUIPOS IGT", "GRAPA PLASTICA", "HERRAMIENTA", "HERRAMIENTA BODEGA",
            "INSTALACION KIT 1 DECO", "INSTALACION KIT 2 DECOS",
            "INSTALLATION KIT - HUGHES", "INSUMOS", "INVENTARIO DIRECTV O&M",
            "KIT PREPAGO", "KIT PREPAGO 1 DECO", "KIT PREPAGO 2 DECOS",
            "KIT PREPAGO 2 DECOS HD", "MATERIALES", "MODEM WOM", "MUEBLES Y ENSERES",
            "OBSEQUIO", "PERCHERO", "PREPAGO GARANTIA", "ROUTER TPLINK EC220-G5 DUAL",
            "SAMSUMG GALAXY J2", "SIM CARD TIGO", "SYM ACTIVO", "SYM EPP",
            "SYM HERRAMIENTA", "TELEVISOR LG 42", "TELEVISOR SAMSUNG", "VASELINA",
            "VELONET - GPON TPLINK 1 PUERTO", "VELONET - ROUTER GPON XZ2000 G3",
            "VELONET EQUIPO HUAWEI ONT 2,4", "WOM",
        ];

        $now = now();
        $rows = array_map(fn ($nombre) => [
            'nombre'     => $nombre,
            'created_at' => $now,
            'updated_at' => $now,
        ], $nombres);

        DB::table('tipos_producto')->insertOrIgnore($rows);
    }

    public function down(): void
    {
        DB::table('tipos_producto')->truncate();
    }
};
