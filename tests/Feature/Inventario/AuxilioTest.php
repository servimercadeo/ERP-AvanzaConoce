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
        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Finalizado', 'modo_atencion' => 'SOLO'])->assertOk();

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

    private function columnaAuxilio(): array
    {
        return collect($this->getJson('/api/work-orders')->assertOk()->json())
            ->pluck('auxilio_calculado', 'numero_wo')->all();
    }

    public function test_el_exporte_trae_el_valor_que_se_le_paga_a_cada_orden(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        $this->crearFinalizadas('555', 3);
        $this->actingAs($this->usuario('admin'));

        $this->assertSame([4000, 4000, 4000], array_values($this->columnaAuxilio()));
    }

    public function test_al_pasar_de_tramo_el_exporte_recalcula_todas_las_ordenes_del_mes(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        $this->crearFinalizadas('555', 100);
        $this->actingAs($this->usuario('admin'));
        $this->assertSame([4000], array_values(array_unique($this->columnaAuxilio())));

        // La número 101 sube a todas al tramo 101-105, no solo a ella.
        $this->crearFinalizadas('555', 1, '2026-10-15', null, 'EXTRA-');

        $valores = $this->columnaAuxilio();
        $this->assertSame([4300], array_values(array_unique($valores)));
        $this->assertCount(101, $valores);
    }

    public function test_el_exporte_no_paga_auxilio_a_aliados_ni_a_lo_que_no_esta_finalizado(): void
    {
        $aliado = Aliado::create(['tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900555668-1', 'nombre' => 'ALIADO SAS']);
        $this->usuario('tecnico', ['cedula' => '777', 'aliado_id' => $aliado->id]);
        $this->usuario('tecnico', ['cedula' => '555']);
        $this->crearFinalizadas('777', 2, '2026-10-15', null, 'ALI-');
        WorkOrder::create(['numero_wo' => 'ABIERTA', 'numero_item' => '', 'cedula_tecnico' => '555', 'estado' => 'Asignado', 'fecha_finalizacion' => '2026-10-15']);
        $this->actingAs($this->usuario('admin'));

        $valores = $this->columnaAuxilio();

        // El aliado nunca cobra auxilio; la del directo aún no está finalizada, así que no se paga todavía.
        $this->assertSame(['N/A'], collect($valores)->filter(fn ($v, $wo) => str_contains($wo, 'ALI-'))->unique()->values()->all());
        $this->assertNull($valores['ABIERTA']);
    }

    public function test_cada_mes_se_paga_con_su_propio_tramo(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        $this->crearFinalizadas('555', 101, '2026-10-15', null, 'OCT-');
        $this->crearFinalizadas('555', 2, '2026-11-15', null, 'NOV-');
        $this->actingAs($this->usuario('admin'));

        $valores = collect($this->columnaAuxilio());

        $this->assertSame([4300], $valores->filter(fn ($v, $wo) => str_contains($wo, 'OCT-'))->unique()->values()->all());
        $this->assertSame([4000], $valores->filter(fn ($v, $wo) => str_contains($wo, 'NOV-'))->unique()->values()->all());
    }

    /** WO finalizadas en el mes donde esa persona quedó como acompañante del técnico. */
    private function crearAcompanadas(int $cantidad, ?\App\Models\User $auxiliar, string $nombre = '', string $fecha = '2026-10-15'): void
    {
        foreach (range(1, $cantidad) as $i) {
            WorkOrder::create([
                'numero_wo' => 'ACOMP-' . ($auxiliar->id ?? $nombre) . "-{$i}", 'numero_item' => '',
                'cedula_tecnico' => '555', 'estado' => 'Finalizado', 'fecha_finalizacion' => $fecha,
                'modo_atencion' => 'ACOMPAÑADO', 'auxiliar' => $auxiliar->name ?? $nombre,
                'auxiliar_user_id' => $auxiliar?->id,
            ]);
        }
    }

    public function test_las_dos_escalas_vienen_sembradas_y_son_distintas(): void
    {
        $this->actingAs($this->usuario('admin'));

        $tecnico = collect($this->getJson('/api/auxilios/tramos')->assertOk()->json());
        $auxiliar = collect($this->getJson('/api/auxilios/tramos?tipo=auxiliar')->assertOk()->json());

        $this->assertSame([[0, 100, 4000], [101, 105, 4300], [106, 120, 4400], [121, null, 5000]],
            $tecnico->map(fn ($t) => [$t['desde'], $t['hasta'], $t['valor_por_orden']])->all());
        $this->assertSame([[0, 20, 0], [21, 30, 3500], [31, 40, 4000], [41, null, 4500]],
            $auxiliar->map(fn ($t) => [$t['desde'], $t['hasta'], $t['valor_por_orden']])->all());
    }

    public function test_el_auxiliar_cobra_por_las_wo_que_acompano_con_su_propia_escala(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        $auxiliar = $this->usuario('general', ['name' => 'Laura Auxiliar', 'cedula' => '777']);
        $this->crearAcompanadas(25, $auxiliar);
        $this->actingAs($this->usuario('admin'));

        $r = $this->getJson('/api/auxilios/reporte?tipo=auxiliar&mes=2026-10')->assertOk()->json();

        $this->assertSame('auxiliar', $r['tipo']);
        $this->assertCount(1, $r['resultados']);
        $this->assertSame(['Laura Auxiliar', '777', 25, 3500, 87500], [
            $r['resultados'][0]['nombre'], $r['resultados'][0]['cedula'], $r['resultados'][0]['total_wo'],
            $r['resultados'][0]['tramo']['valor_por_orden'], $r['resultados'][0]['total_auxilio'],
        ]);
    }

    public function test_hasta_20_acompanamientos_el_auxiliar_no_cobra(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        $auxiliar = $this->usuario('general', ['name' => 'Laura Auxiliar']);
        $this->crearAcompanadas(20, $auxiliar);
        $this->actingAs($this->usuario('admin'));

        $r = $this->getJson('/api/auxilios/reporte?tipo=auxiliar&mes=2026-10')->assertOk()->json('resultados');

        $this->assertSame([20, 0, 0], [$r[0]['total_wo'], $r[0]['tramo']['valor_por_orden'], $r[0]['total_auxilio']]);
    }

    public function test_al_pasar_de_tramo_el_auxiliar_recalcula_todas_sus_ordenes(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        $auxiliar = $this->usuario('general', ['name' => 'Laura Auxiliar']);
        $this->crearAcompanadas(41, $auxiliar);
        $this->actingAs($this->usuario('admin'));

        $r = $this->getJson('/api/auxilios/reporte?tipo=auxiliar&mes=2026-10')->assertOk()->json('resultados');

        $this->assertSame([41, 4500, 184500], [$r[0]['total_wo'], $r[0]['tramo']['valor_por_orden'], $r[0]['total_auxilio']]);
    }

    public function test_el_auxiliar_que_trae_el_excel_en_una_wo_de_aliado_no_cobra(): void
    {
        $aliado = Aliado::create(['tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900555666-1', 'nombre' => 'ALIADO SAS']);
        $this->usuario('tecnico', ['cedula' => '777', 'aliado_id' => $aliado->id]);
        $this->usuario('tecnico', ['cedula' => '555']);
        // Importadas: la columna "Auxiliar" llega en WO del aliado y en una del directo.
        foreach (range(1, 30) as $i) {
            WorkOrder::create(['numero_wo' => "AL-{$i}", 'numero_item' => '', 'cedula_tecnico' => '777', 'estado' => 'Finalizado',
                'fecha_finalizacion' => '2026-10-15', 'auxiliar' => 'Pedro Del Excel']);
        }
        WorkOrder::create(['numero_wo' => 'DI-1', 'numero_item' => '', 'cedula_tecnico' => '555', 'estado' => 'Finalizado',
            'fecha_finalizacion' => '2026-10-15', 'auxiliar' => 'Pedro Del Excel']);
        $this->actingAs($this->usuario('admin'));

        $r = $this->getJson('/api/auxilios/reporte?tipo=auxiliar&mes=2026-10')->assertOk()->json('resultados');

        // Solo cuenta la que acompañó al directo.
        $this->assertSame([['Pedro Del Excel', 1]], array_map(fn ($f) => [$f['nombre'], $f['total_wo']], $r));
    }

    public function test_el_auxiliar_elegido_del_parametro_trae_la_cedula_del_empleado(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        $this->usuario('general', ['name' => 'Michel Jaramillo Cardona', 'cedula' => '1098765']);
        // Guardado por nombre (valor del parámetro), sin auxiliar_user_id.
        $this->crearAcompanadas(2, null, 'MICHEL  JARAMILLO CARDONA');
        $this->actingAs($this->usuario('admin'));

        $r = $this->getJson('/api/auxilios/reporte?tipo=auxiliar&mes=2026-10')->assertOk()->json('resultados');

        $this->assertSame('1098765', $r[0]['cedula']);
    }

    public function test_un_auxiliar_que_no_es_empleado_sale_por_su_nombre(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        $this->crearAcompanadas(3, null, 'Pedro Del Parametro');
        $this->actingAs($this->usuario('admin'));

        $r = $this->getJson('/api/auxilios/reporte?tipo=auxiliar&mes=2026-10')->assertOk()->json('resultados');

        $this->assertSame(['Pedro Del Parametro', '', 3], [$r[0]['nombre'], $r[0]['cedula'], $r[0]['total_wo']]);
    }

    public function test_las_dos_escalas_no_se_mezclan_en_el_reporte(): void
    {
        $this->usuario('tecnico', ['cedula' => '555', 'name' => 'Carlos Tecnico']);
        $auxiliar = $this->usuario('general', ['name' => 'Laura Auxiliar']);
        $this->crearFinalizadas('555', 3);
        $this->crearAcompanadas(25, $auxiliar);
        $this->actingAs($this->usuario('admin'));

        $tecnicos = collect($this->getJson('/api/auxilios/reporte?mes=2026-10')->assertOk()->json('resultados'));
        $auxiliares = collect($this->getJson('/api/auxilios/reporte?tipo=auxiliar&mes=2026-10')->assertOk()->json('resultados'));

        // Las 25 acompañadas también las finalizó el técnico 555, así que a él le cuentan 28.
        $this->assertSame(['Carlos Tecnico'], $tecnicos->pluck('nombre')->all());
        $this->assertSame(28, $tecnicos[0]['total_wo']);
        $this->assertSame(['Laura Auxiliar'], $auxiliares->pluck('nombre')->all());
    }

    public function test_cada_escala_se_configura_por_su_lado(): void
    {
        $this->actingAs($this->usuario('admin'));

        $id = $this->postJson('/api/auxilios/tramos?tipo=auxiliar', ['desde' => 200, 'hasta' => null, 'valor_por_orden' => 9000])
            ->assertCreated()->json('id');

        $this->assertSame('auxiliar', \App\Models\AuxilioTramo::find($id)->tipo);
        $this->assertContains(9000, array_column($this->getJson('/api/auxilios/tramos?tipo=auxiliar')->json(), 'valor_por_orden'));
        $this->assertNotContains(9000, array_column($this->getJson('/api/auxilios/tramos')->json(), 'valor_por_orden'));
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

    public function test_los_tramos_por_defecto_de_cada_escala_quedan_sembrados_por_la_migracion(): void
    {
        $this->assertSame(4, AuxilioTramo::deTipo(AuxilioTramo::TECNICO)->count());
        $this->assertSame(4, AuxilioTramo::deTipo(AuxilioTramo::AUXILIAR)->count());
        $this->assertDatabaseHas('auxilio_tramos', ['tipo' => 'tecnico', 'desde' => 0, 'hasta' => 100, 'valor_por_orden' => 4000]);
        $this->assertDatabaseHas('auxilio_tramos', ['tipo' => 'tecnico', 'desde' => 121, 'hasta' => null, 'valor_por_orden' => 5000]);
        $this->assertDatabaseHas('auxilio_tramos', ['tipo' => 'auxiliar', 'desde' => 0, 'hasta' => 20, 'valor_por_orden' => 0]);
        $this->assertDatabaseHas('auxilio_tramos', ['tipo' => 'auxiliar', 'desde' => 41, 'hasta' => null, 'valor_por_orden' => 4500]);
    }
}
