<?php

namespace Tests\Feature\Catalogos;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SeedParametrosWorkOrdersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // RefreshDatabase ya corrió esta migración: se parte de los catálogos vacíos.
        DB::table('valores_parametro')->delete();
        DB::table('tipos_parametro')->delete();
    }

    private function correrMigracion(): void
    {
        $migracion = require database_path('migrations/2026_10_27_000001_seed_parametros_work_orders.php');
        $migracion->up();
    }

    /**
     * Producción puede tener ya los catálogos cargados a mano con otras mayúsculas o tildes:
     * el índice único (tipo, nombre) de MySQL los considera el mismo valor, así que la
     * migración no debe intentar insertarlos otra vez (fallaría y trabaría `migrate`).
     */
    public function test_no_falla_si_ya_existen_valores_con_otras_mayusculas_o_tildes(): void
    {
        $tipo = DB::table('tipos_parametro')->insertGetId(['nombre' => 'Perímetro de la Zona', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('valores_parametro')->insert([
            ['tipo_parametro_id' => $tipo, 'nombre' => 'Urbano', 'created_at' => now(), 'updated_at' => now()],
            ['tipo_parametro_id' => $tipo, 'nombre' => 'Aéreo/Fluvial', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->correrMigracion();

        $this->assertSame(4, DB::table('valores_parametro')->where('tipo_parametro_id', $tipo)->count());
        $this->assertSame('Work Orders', DB::table('tipos_parametro')->where('id', $tipo)->value('grupo'));
    }

    public function test_se_puede_correr_dos_veces_sin_duplicar(): void
    {
        $this->correrMigracion();
        $total = DB::table('valores_parametro')->count();

        $this->correrMigracion();

        $this->assertSame($total, DB::table('valores_parametro')->count());
        $this->assertSame(5, DB::table('tipos_parametro')->where('grupo', 'Work Orders')->count());
    }
}
