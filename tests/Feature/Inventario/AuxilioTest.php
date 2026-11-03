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

    public function test_la_wo_que_finaliza_un_tecnico_directo_aparece_en_el_auxilio_del_mes(): void
    {
        $tecnico = $this->usuario('tecnico', ['cedula' => '555', 'name' => 'Carlos Ruiz']);
        $wo = WorkOrder::create([
            'numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '555',
            'estado' => 'Asignado', 'fecha_finalizacion' => '2026-09-25',
        ]);
        $admin = $this->usuario('admin');

        $this->actingAs($admin);
        $this->assertCount(0, $this->getJson('/api/auxilios/reporte')->assertOk()->json('resultados'));
        $this->assertCount(0, $this->getJson('/api/auxilios/reporte?mes=2026-09')->assertOk()->json('resultados'));

        $this->app['auth']->forgetGuards();
        $this->actingAs($tecnico);
        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Finalizado'])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->actingAs($admin);
        $r = $this->getJson('/api/auxilios/reporte')->assertOk()->json('resultados');

        $this->assertCount(1, $r);
        $this->assertSame('555', $r[0]['cedula']);
        $this->assertSame('Carlos Ruiz', $r[0]['nombre']);
        $this->assertSame(1, $r[0]['total_wo']);
        $this->assertSame(4000, $r[0]['total_auxilio']);
    }

    public function test_el_admin_ve_tambien_a_los_directos_sin_usuario_segun_la_modalidad_del_archivo(): void
    {
        $base = ['numero_item' => '', 'estado' => 'Finalizado', 'fecha_finalizacion' => '2026-10-15'];
        WorkOrder::create($base + ['numero_wo' => 'WO1', 'cedula_tecnico' => '111', 'modalidad' => ' directo ', 'nombre_tecnico' => 'Ana Directa']);
        WorkOrder::create($base + ['numero_wo' => 'WO2', 'cedula_tecnico' => '222', 'modalidad' => 'ALIADO', 'nombre_tecnico' => 'Luis Aliado']);
        WorkOrder::create($base + ['numero_wo' => 'WO3', 'cedula_tecnico' => '333', 'nombre_tecnico' => 'Sin Modalidad']);
        $this->actingAs($this->usuario('admin'));

        $r = $this->getJson('/api/auxilios/reporte?mes=2026-10')->assertOk()->json('resultados');

        $this->assertCount(1, $r);
        $this->assertSame('111', $r[0]['cedula']);
        $this->assertSame('Ana Directa', $r[0]['nombre']);
    }

    public function test_el_usuario_registrado_manda_sobre_la_modalidad_del_archivo(): void
    {
        $aliado = Aliado::create(['tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900555667-1', 'nombre' => 'ALIADO SAS']);
        $this->usuario('tecnico', ['cedula' => '777', 'aliado_id' => $aliado->id]);
        WorkOrder::create([
            'numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '777', 'modalidad' => 'DIRECTO',
            'estado' => 'Finalizado', 'fecha_finalizacion' => '2026-10-15',
        ]);
        $this->actingAs($this->usuario('admin'));

        $this->assertCount(0, $this->getJson('/api/auxilios/reporte?mes=2026-10')->assertOk()->json('resultados'));
    }

    public function test_una_orden_con_varios_items_se_paga_una_sola_vez(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        foreach (['1', '2', '3'] as $item) {
            WorkOrder::create([
                'numero_wo' => 'WO1', 'numero_item' => $item, 'cedula_tecnico' => '555',
                'estado' => 'Finalizado', 'fecha_finalizacion' => '2026-10-15',
            ]);
        }
        $this->actingAs($this->usuario('admin'));

        $r = $this->getJson('/api/auxilios/reporte?mes=2026-10')->assertOk()->json('resultados');

        $this->assertSame(1, $r[0]['total_wo']);
        $this->assertSame(4000, $r[0]['total_auxilio']);
    }

    public function test_cuenta_para_quien_la_cerro_aunque_estuviera_agendada_a_otro(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        $this->usuario('tecnico', ['cedula' => '999']);
        WorkOrder::create([
            'numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '555', 'cedula_tecnico_agendado' => '999',
            'cedula_tecnico_cierre' => '555', 'estado' => 'Finalizado', 'fecha_finalizacion' => '2026-10-15',
        ]);
        $this->actingAs($this->usuario('admin'));

        $r = $this->getJson('/api/auxilios/reporte?mes=2026-10')->assertOk()->json('resultados');

        $this->assertCount(1, $r);
        $this->assertSame('555', $r[0]['cedula']);
    }

    public function test_el_tecnico_solo_ve_su_propio_auxilio(): void
    {
        $tecnico = $this->usuario('tecnico', ['cedula' => '555', 'name' => 'Carlos Ruiz']);
        $this->usuario('tecnico', ['cedula' => '666', 'name' => 'Otro Tecnico']);
        $this->crearFinalizadas('555', 3);
        $this->crearFinalizadas('666', 7);
        $this->actingAs($tecnico);

        $r = $this->getJson('/api/auxilios/reporte?mes=2026-10')->assertOk()->json('resultados');

        $this->assertCount(1, $r);
        $this->assertSame('555', $r[0]['cedula']);
        $this->assertSame(3, $r[0]['total_wo']);
    }

    public function test_el_tecnico_sin_cedula_no_ve_ningun_auxilio(): void
    {
        $this->crearFinalizadas('666', 7);
        WorkOrder::create(['numero_wo' => 'WO-SIN', 'numero_item' => '', 'modalidad' => 'DIRECTO', 'estado' => 'Finalizado', 'fecha_finalizacion' => '2026-10-15']);
        $this->usuario('tecnico', ['cedula' => '666']);
        $this->actingAs($this->usuario('tecnico', ['cedula' => '']));

        $this->assertCount(0, $this->getJson('/api/auxilios/reporte?mes=2026-10')->assertOk()->json('resultados'));
    }

    public function test_el_admin_ve_el_auxilio_de_todos(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        $this->usuario('tecnico', ['cedula' => '666']);
        $this->crearFinalizadas('555', 3);
        $this->crearFinalizadas('666', 7);
        $this->actingAs($this->usuario('admin'));

        $this->assertCount(2, $this->getJson('/api/auxilios/reporte?mes=2026-10')->assertOk()->json('resultados'));
    }

    public function test_el_tecnico_no_puede_editar_las_escalas(): void
    {
        $tramo = AuxilioTramo::first();
        $this->actingAs($this->usuario('tecnico', ['cedula' => '555']));

        $this->postJson('/api/auxilios/tramos', ['desde' => 0, 'hasta' => 10, 'valor_por_orden' => 1000])->assertForbidden();
        $this->putJson("/api/auxilios/tramos/{$tramo->id}", ['desde' => 0, 'hasta' => 10, 'valor_por_orden' => 1000])->assertForbidden();
        $this->deleteJson("/api/auxilios/tramos/{$tramo->id}")->assertForbidden();
    }

    public function test_los_demas_roles_no_ven_auxilios(): void
    {
        foreach (['th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general'] as $rol) {
            $this->app['auth']->forgetGuards();
            $this->actingAs($this->usuario($rol));

            $this->getJson('/api/auxilios/reporte')->assertForbidden();
        }
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
