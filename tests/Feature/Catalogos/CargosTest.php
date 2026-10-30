<?php

namespace Tests\Feature\Catalogos;

use App\Models\Cargo;
use App\Models\Contrato;
use App\Models\PermisoDenegado;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/** Parámetros > Cargos (CargoController): el catálogo de los selects de cargo. */
class CargosTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actuarComo('admin');
    }

    public function test_crear_un_cargo_lo_normaliza_y_aparece_en_los_selects(): void
    {
        $maxId = (int) Cargo::max('id');

        // La pantalla solo manda el nombre.
        $r = $this->postJson('/api/cargos', ['nombre' => '  coordinador   de  zona '])->assertCreated();

        $r->assertJsonPath('nombre', 'COORDINADOR DE ZONA')->assertJsonPath('en_requisicion', true);
        $this->assertSame($maxId + 1, (int) $r->json('id'), 'El id no es autoincremental: max + 1.');

        // Sale en todo lado: Contratos/Empleados/Seguimiento (catalogos) y Selección (requisición).
        $this->assertContains('COORDINADOR DE ZONA', $this->getJson('/api/catalogos')->json('cargos'));
        $sel = $this->getJson('/api/seleccion/catalogos')->assertOk();
        $this->assertContains('COORDINADOR DE ZONA', collect($sel->json('cargos_requisicion'))->pluck('nombre')->all());
        $this->assertContains('COORDINADOR DE ZONA', collect($sel->json('cargos'))->pluck('nombre')->all());

        // Editar el nombre no le cambia en qué selects sale.
        $this->putJson('/api/cargos/' . $r->json('id'), ['nombre' => 'Coordinador regional'])->assertOk()->assertJsonPath('en_requisicion', true);
        $this->assertNotContains('COORDINADOR DE ZONA', $this->getJson('/api/catalogos')->json('cargos'));
        $this->assertContains('COORDINADOR REGIONAL', $this->getJson('/api/catalogos')->json('cargos'));
    }

    public function test_nombre_obligatorio_y_sin_duplicados(): void
    {
        $this->postJson('/api/cargos', ['nombre' => ' '])->assertJsonPath('errors.nombre.0', 'Escribe el nombre del cargo.');
        $this->postJson('/api/cargos', ['nombre' => 'Supervisor Zonal'])->assertCreated();
        $this->postJson('/api/cargos', ['nombre' => 'supervisor   zonal'])->assertJsonPath('errors.nombre.0', 'Ya existe un cargo con ese nombre.');
    }

    public function test_renombrar_actualiza_contratos_y_empleados_y_marcar_requisicion(): void
    {
        $id = $this->postJson('/api/cargos', ['nombre' => 'GESTOR DE COBRO'])->json('id');
        $empleado = $this->usuario('general', ['cargo' => 'Gestor de Cobro']);
        Contrato::create(['empleado_id' => $empleado->id, 'cargo' => 'GESTOR DE COBRO', 'fecha_ingreso' => '2026-01-01', 'estado_contrato' => 'Vigente', 'completado' => true]);
        $otro = $this->usuario('general', ['cargo' => 'ASESOR COMERCIAL']);

        $this->putJson("/api/cargos/{$id}", ['nombre' => 'gestor de cartera', 'en_requisicion' => true])->assertOk()
            ->assertJsonPath('nombre', 'GESTOR DE CARTERA')->assertJsonPath('en_requisicion', true);

        $this->assertSame('GESTOR DE CARTERA', $empleado->fresh()->cargo);
        $this->assertSame('GESTOR DE CARTERA', Contrato::where('empleado_id', $empleado->id)->value('cargo'));
        $this->assertSame('ASESOR COMERCIAL', $otro->fresh()->cargo, 'Los demás no se tocan.');

        // El listado muestra cuántos lo usan.
        $fila = collect($this->getJson('/api/cargos')->assertOk()->json())->firstWhere('id', $id);
        $this->assertSame([1, 1], [$fila['contratos_count'], $fila['empleados_count']]);
    }

    public function test_no_se_elimina_un_cargo_en_uso_y_si_uno_libre(): void
    {
        $usado = $this->postJson('/api/cargos', ['nombre' => 'CARGO USADO'])->json('id');
        $this->usuario('general', ['cargo' => 'CARGO USADO']);
        $this->deleteJson("/api/cargos/{$usado}")->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'está en uso (1 empleados)'));
        $this->assertTrue(Cargo::whereKey($usado)->exists());

        $requisicion = $this->postJson('/api/cargos', ['nombre' => 'CARGO EN REQUISICION'])->json('id');
        DB::table('requisiciones')->insert(['cargo_id' => $requisicion, 'nro_identificacion_proceso' => 'REQ-TEST', 'fecha_solicitud' => '2026-10-01', 'created_at' => now(), 'updated_at' => now()]);
        $this->deleteJson("/api/cargos/{$requisicion}")->assertStatus(422);

        $libre = $this->postJson('/api/cargos', ['nombre' => 'CARGO LIBRE'])->json('id');
        $this->deleteJson("/api/cargos/{$libre}")->assertNoContent();
        $this->assertFalse(Cargo::whereKey($libre)->exists());
    }

    public function test_permisos_de_la_matriz(): void
    {
        $id = $this->postJson('/api/cargos', ['nombre' => 'CARGO PERMISOS'])->json('id');
        // TH sin "Eliminar" en Cargos: ve y edita, no elimina.
        PermisoDenegado::create(['rol' => 'th', 'modulo_id' => 'parametros', 'submodulo_id' => 'cargos', 'archivo_id' => 'cargos_file', 'accion' => 'eliminar']);
        $this->actuarComo('th');
        $this->getJson('/api/cargos')->assertOk();
        $this->putJson("/api/cargos/{$id}", ['nombre' => 'CARGO PERMISOS 2'])->assertOk();
        $this->deleteJson("/api/cargos/{$id}")->assertForbidden();

        // Rol sin el submódulo: no lo ve.
        PermisoDenegado::create(['rol' => 'tic', 'modulo_id' => 'parametros', 'submodulo_id' => 'cargos', 'archivo_id' => '', 'accion' => '']);
        $this->actuarComo('tic');
        $this->getJson('/api/cargos')->assertForbidden();
        $this->postJson('/api/cargos', ['nombre' => 'X'])->assertForbidden();
    }
}
