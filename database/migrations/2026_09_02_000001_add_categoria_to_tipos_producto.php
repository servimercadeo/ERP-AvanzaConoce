<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tipos_producto', function (Blueprint $table) {
            $table->string('categoria', 30)->nullable()->after('nombre');
        });

        // Clasificación inicial de los tipos de producto ya existentes en las 6 categorías
        // fijas. Los que se creen después deben elegir categoría al guardarse.
        $categorias = [
            'Activos' => [
                'ACTIVOS', 'SYM ACTIVO', 'CELULAR HUAWEI G610', 'CELULARES', 'SAMSUMG GALAXY J2',
                'TELEVISOR LG 42', 'TELEVISOR SAMSUNG', 'EQUIPO HUAWEI ONT 2.4',
                'ROUTER TPLINK EC220-G5 DUAL', 'MODEM WOM', 'EQUIPOS IGT',
                'VELONET - GPON TPLINK 1 PUERTO', 'VELONET - ROUTER GPON XZ2000 G3',
                'VELONET EQUIPO HUAWEI ONT 2,4', 'MUEBLES Y ENSERES', 'DESCANSA PIES', 'PERCHERO',
            ],
            'Materiales' => [
                'AMARRAS', 'AMARRES Y GRAPAS', 'CABLE INTERNET', 'CABLE TELEVISION', 'CINTA NEGRA',
                'CONECTORES', 'GRAPA PLASTICA', 'MATERIALES', 'VASELINA', 'INSUMOS',
                'INVENTARIO DIRECTV O&M', 'OBSEQUIO', 'ACCESORIOS',
            ],
            'Equipos' => [
                'EQUIPOS DE COMPUTO', 'KIT PREPAGO', 'KIT PREPAGO 1 DECO', 'KIT PREPAGO 2 DECOS',
                'KIT PREPAGO 2 DECOS HD', 'INSTALACION KIT 1 DECO', 'INSTALACION KIT 2 DECOS',
                'INSTALLATION KIT - HUGHES', 'DTV- ANTENA', 'DTV- MDU', 'DTV- NET', 'DTV- NEXUS',
                'DTV- SERIALIZADOS', 'SIM CARD TIGO', 'PREPAGO GARANTIA', 'WOM',
            ],
            'Dotación' => [
                'DOTACION', 'DOTACION COMERCIAL', 'DOTACION CYC',
            ],
            'EPP' => [
                'EPP', 'SYM EPP',
            ],
            'Herramientas' => [
                'HERRAMIENTA', 'HERRAMIENTA BODEGA', 'SYM HERRAMIENTA',
            ],
        ];

        foreach ($categorias as $categoria => $nombres) {
            DB::table('tipos_producto')->whereIn('nombre', $nombres)->update(['categoria' => $categoria]);
        }
    }

    public function down(): void
    {
        Schema::table('tipos_producto', function (Blueprint $table) {
            $table->dropColumn('categoria');
        });
    }
};
