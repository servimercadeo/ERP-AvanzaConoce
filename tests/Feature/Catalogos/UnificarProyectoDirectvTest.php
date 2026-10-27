<?php

namespace Tests\Feature\Catalogos;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Migración 2026_10_25_000001: el proyecto DIRECTV se llamaba "DIRECTV CO" (local) y
 * "DIRECTV COL" (producción). Queda uno solo, "DIRECTV", con todo lo que tenían los dos.
 */
class UnificarProyectoDirectvTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private function migrar(): void
    {
        (require base_path('database/migrations/2026_10_25_000001_unificar_proyecto_directv.php'))->up();
    }

    public function test_fusiona_los_dos_nombres_y_actualiza_los_textos(): void
    {
        // Como en producción: dos filas (la de las migraciones ya quedó como "DIRECTV").
        $id = DB::table('proyectos')->where('nombre', 'DIRECTV')->value('id');
        DB::table('proyectos')->where('id', $id)->update(['nombre' => 'DIRECTV CO']);
        $duplicado = DB::table('proyectos')->insertGetId(['nombre' => 'DIRECTV COL', 'activo' => true, 'created_at' => now(), 'updated_at' => now()]);

        $comun = $this->sede();
        $soloDelDuplicado = $this->sede();
        foreach ([[$id, $comun], [$duplicado, $comun], [$duplicado, $soloDelDuplicado]] as [$p, $s]) {
            DB::table('proyecto_sede')->insert(['proyecto_id' => $p, 'sede_id' => $s, 'created_at' => now(), 'updated_at' => now()]);
        }
        DB::table('sedes')->where('id', $soloDelDuplicado)->update(['proyecto_id' => $duplicado]);
        DB::table('cronograma_dotacion')->insert(['proyecto_id' => $duplicado, 'fecha_entrega' => '2026-11-01', 'ciclo_meses' => 6, 'activo' => true, 'created_at' => now(), 'updated_at' => now()]);

        $empleado = $this->usuario();
        $contratoCo = DB::table('contratos')->insertGetId(['empleado_id' => $empleado->id, 'cliente_proyecto' => 'DIRECTV CO', 'created_at' => now(), 'updated_at' => now()]);
        $contratoCol = DB::table('contratos')->insertGetId(['empleado_id' => $empleado->id, 'cliente_proyecto' => ' directv col ', 'created_at' => now(), 'updated_at' => now()]);
        $contratoTigo = DB::table('contratos')->insertGetId(['empleado_id' => $empleado->id, 'cliente_proyecto' => 'TIGO HOME', 'created_at' => now(), 'updated_at' => now()]);

        $this->migrar();
        $this->migrar(); // se puede correr de nuevo sin cambiar nada

        $this->assertSame(1, DB::table('proyectos')->where('nombre', 'DIRECTV')->count());
        $this->assertFalse(DB::table('proyectos')->whereIn('nombre', ['DIRECTV CO', 'DIRECTV COL'])->exists());
        $this->assertSame($id, DB::table('proyectos')->where('nombre', 'DIRECTV')->value('id'));
        $this->assertEqualsCanonicalizing([$comun, $soloDelDuplicado], DB::table('proyecto_sede')->where('proyecto_id', $id)->pluck('sede_id')->all());
        $this->assertSame($id, DB::table('sedes')->where('id', $soloDelDuplicado)->value('proyecto_id'));
        $this->assertSame($id, DB::table('cronograma_dotacion')->value('proyecto_id'));
        $this->assertSame('DIRECTV', DB::table('contratos')->where('id', $contratoCo)->value('cliente_proyecto'));
        $this->assertSame('DIRECTV', DB::table('contratos')->where('id', $contratoCol)->value('cliente_proyecto'));
        $this->assertSame('TIGO HOME', DB::table('contratos')->where('id', $contratoTigo)->value('cliente_proyecto'));
    }
}
