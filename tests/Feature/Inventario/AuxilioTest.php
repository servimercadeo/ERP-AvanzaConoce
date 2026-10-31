<?php

namespace Tests\Feature\Inventario;

use App\Models\Aliado;
use App\Models\AuxilioTramo;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class AuxilioTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private function crearFinalizadas(string $cedula, int $cantidad, string $fecha = '2026-10-15', ?string $cedulaAgendado = null, string $prefijo = ''): void
    {
        foreach (range(1, $cantidad) as $i) {
            WorkOrder::create([
                'numero_wo' => "WO-{$prefijo}{$cedula}-{$i}", 'numero_item' => '',
                'cedula_tecnico' => $cedula, 'cedula_tecnico_agendado' => $cedulaAgendado,
                'estado' => 'Finalizado', 'fecha_finalizacion' => $fecha,
            ]);
        }
    }

    public function test_tecnico_directo_cae_en_el_tramo_que_corresponde_a_su_total_del_mes(): void
    {
        $this->usuario('tecnico', ['cedula' => '555', 'name' => 'Carlos Ruiz']);
        $this->crearFinalizadas('555', 50);
        $this->actingAs($this->usuario('admin'));

        $r = $this->getJson('/api/auxilios/reporte?mes=2026-10')->assertOk()->json();

        $this->assertCount(1, $r['resultados']);
        $this->assertSame('555', $r['resultados'][0]['cedula']);
        $this->assertSame(50, $r['resultados'][0]['total_wo']);
        $this->assertSame(4000, $r['resultados'][0]['tramo']['valor_por_orden']);
        $this->assertSame(200000, $r['resultados'][0]['total_auxilio']);
    }

    public function test_el_tramo_es_plano_sobre_el_total_no_progresivo(): void
    {
        // 110 WO cae en el tramo 106-120 (4400): las 110 se pagan a 4400, no solo las que
        // pasan de 105.
        $this->usuario('tecnico', ['cedula' => '555']);
        $this->crearFinalizadas('555', 110);
        $this->actingAs($this->usuario('admin'));

        $r = $this->getJson('/api/auxilios/reporte?mes=2026-10')->assertOk()->json();

        $this->assertSame(110, $r['resultados'][0]['total_wo']);
        $this->assertSame(4400, $r['resultados'][0]['tramo']['valor_por_orden']);
        $this->assertSame(484000, $r['resultados'][0]['total_auxilio']);
    }

    public function test_tecnico_indirecto_nunca_aparece_en_el_reporte(): void
    {
        $aliado = Aliado::create(['tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900555666-1', 'nombre' => 'ALIADO SAS']);
        $this->usuario('tecnico', ['cedula' => '777', 'aliado_id' => $aliado->id]);
        $this->crearFinalizadas('777', 200);
        $this->actingAs($this->usuario('admin'));

        $r = $this->getJson('/api/auxilios/reporte?mes=2026-10')->assertOk()->json();

        $this->assertCount(0, $r['resultados']);
    }

    public function test_solo_cuenta_wo_finalizadas_dentro_del_mes_consultado(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        $this->crearFinalizadas('555', 10, '2026-10-31', null, 'OCT-');
        $this->crearFinalizadas('555', 5, '2026-11-01', null, 'NOV-');
        $this->actingAs($this->usuario('admin'));

        $r = $this->getJson('/api/auxilios/reporte?mes=2026-10')->assertOk()->json();

        $this->assertSame(10, $r['resultados'][0]['total_wo']);
    }

    public function test_wo_no_finalizada_no_cuenta(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '555', 'estado' => 'Abierta']);
        $this->actingAs($this->usuario('admin'));

        $r = $this->getJson('/api/auxilios/reporte?mes=2026-10')->assertOk()->json();

        $this->assertCount(0, $r['resultados']);
    }

    public function test_usa_cedula_tecnico_agendado_si_existe(): void
    {
        $this->usuario('tecnico', ['cedula' => '555', 'name' => 'Carlos Ruiz']);
        $this->crearFinalizadas('999', 20, '2026-10-15', '555');
        $this->actingAs($this->usuario('admin'));

        $r = $this->getJson('/api/auxilios/reporte?mes=2026-10')->assertOk()->json();

        $this->assertCount(1, $r['resultados']);
        $this->assertSame('555', $r['resultados'][0]['cedula']);
    }

    public function test_tecnico_no_puede_ver_ni_editar_auxilios(): void
    {
        $this->actingAs($this->usuario('tecnico', ['cedula' => '555']));

        $this->getJson('/api/auxilios/reporte')->assertForbidden();
        $this->getJson('/api/auxilios/tramos')->assertForbidden();
        $this->postJson('/api/auxilios/tramos', ['desde' => 0, 'hasta' => 10, 'valor_por_orden' => 1000])->assertForbidden();
    }

    public function test_admin_puede_crear_editar_y_eliminar_tramos(): void
    {
        $this->actingAs($this->usuario('admin'));

        $id = $this->postJson('/api/auxilios/tramos', ['desde' => 200, 'hasta' => null, 'valor_por_orden' => 6000])
            ->assertCreated()->json('id');

        $this->putJson("/api/auxilios/tramos/{$id}", ['desde' => 200, 'hasta' => 250, 'valor_por_orden' => 6500])
            ->assertOk()->assertJsonPath('valor_por_orden', 6500);

        $this->deleteJson("/api/auxilios/tramos/{$id}")->assertNoContent();
        $this->assertDatabaseMissing('auxilio_tramos', ['id' => $id]);
    }

    public function test_los_4_tramos_por_defecto_quedan_sembrados_por_la_migracion(): void
    {
        $this->assertSame(4, AuxilioTramo::count());
        $this->assertDatabaseHas('auxilio_tramos', ['desde' => 0, 'hasta' => 100, 'valor_por_orden' => 4000]);
        $this->assertDatabaseHas('auxilio_tramos', ['desde' => 121, 'hasta' => null, 'valor_por_orden' => 5000]);
    }
}
