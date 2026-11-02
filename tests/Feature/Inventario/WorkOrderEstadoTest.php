<?php

namespace Tests\Feature\Inventario;

use App\Models\Aliado;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class WorkOrderEstadoTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private function importar(array $fila): void
    {
        $this->actingAs($this->usuario('admin'));
        $this->postJson('/api/work-orders/importar', ['items' => [['numero_wo' => 'WO1', 'numero_item' => '1', 'estado' => 'Completa'] + $fila]])->assertOk();
    }

    private function estadoImportado(): string
    {
        return WorkOrder::where('numero_wo', 'WO1')->value('estado');
    }

    private function tecnicoAliado(string $cedula): void
    {
        $aliado = Aliado::create(['tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900777888-1', 'nombre' => 'ALIADO SAS']);
        $this->usuario('tecnico', ['cedula' => $cedula, 'aliado_id' => $aliado->id]);
    }

    public function test_importar_deja_finalizada_la_wo_de_un_tecnico_aliado(): void
    {
        $this->tecnicoAliado('777');

        $this->importar(['cedula_tecnico' => '777']);

        $this->assertSame('Finalizado', $this->estadoImportado());
    }

    public function test_importar_deja_asignada_la_wo_de_un_tecnico_directo(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);

        $this->importar(['cedula_tecnico' => '555']);

        $this->assertSame('Asignado', $this->estadoImportado());
    }

    public function test_el_tecnico_agendado_manda_sobre_la_cedula_del_que_atendio(): void
    {
        $this->tecnicoAliado('777');
        $this->usuario('tecnico', ['cedula' => '555']);

        $this->importar(['cedula_tecnico' => '555', 'cedula_tecnico_agendado' => '777']);

        $this->assertSame('Finalizado', $this->estadoImportado());
    }

    public function test_cedula_sin_usuario_usa_la_modalidad_del_archivo(): void
    {
        $this->importar(['cedula_tecnico' => '999', 'modalidad' => 'ALIADO']);
        $this->assertSame('Finalizado', $this->estadoImportado());

        WorkOrder::query()->delete();
        $this->importar(['cedula_tecnico' => '999', 'modalidad' => ' directo ']);
        $this->assertSame('Asignado', $this->estadoImportado());
    }

    public function test_el_usuario_registrado_manda_sobre_la_modalidad_del_archivo(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);

        $this->importar(['cedula_tecnico' => '555', 'modalidad' => 'ALIADO']);

        $this->assertSame('Asignado', $this->estadoImportado());
    }

    public function test_sin_usuario_ni_modalidad_conserva_el_estado_del_archivo(): void
    {
        $this->importar(['cedula_tecnico' => '999']);

        $this->assertSame('Completa', $this->estadoImportado());
    }

    public function test_reimportar_no_reabre_la_wo_que_un_directo_ya_cambio(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        $this->importar(['cedula_tecnico' => '555']);
        WorkOrder::where('numero_wo', 'WO1')->update(['estado' => 'Finalizado']);

        $this->importar(['cedula_tecnico' => '555']);

        $this->assertSame('Finalizado', $this->estadoImportado());
    }

    public function test_una_wo_de_directo_en_el_estado_atendido_que_ya_no_existe_vuelve_a_asignado(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        $this->importar(['cedula_tecnico' => '555']);
        WorkOrder::where('numero_wo', 'WO1')->update(['estado' => 'Atendido']);

        $this->importar(['cedula_tecnico' => '555']);

        $this->assertSame('Asignado', $this->estadoImportado());
    }

    public function test_la_migracion_aplica_la_regla_a_lo_ya_importado(): void
    {
        $this->tecnicoAliado('777');
        $this->usuario('tecnico', ['cedula' => '555']);
        $crear = fn (string $wo, array $datos) => WorkOrder::create($datos + ['numero_wo' => $wo, 'numero_item' => '', 'estado' => 'Completa']);
        $crear('ALIADO', ['cedula_tecnico' => '777']);
        $crear('DIRECTO', ['cedula_tecnico' => '555']);
        $crear('MOD-ALIADO', ['cedula_tecnico' => '999', 'modalidad' => 'ALIADO']);
        $crear('MOD-DIRECTO', ['cedula_tecnico' => '999', 'modalidad' => 'DIRECTO']);
        $crear('SIN-DATOS', ['cedula_tecnico' => '999']);
        $crear('YA-CERRADA', ['cedula_tecnico' => '555', 'estado' => 'Finalizado']);

        $migracion = require database_path('migrations/2026_11_02_000007_estado_work_orders_segun_tipo_de_tecnico.php');
        $migracion->up();

        $this->assertSame([
            'ALIADO' => 'Finalizado', 'DIRECTO' => 'Asignado', 'MOD-ALIADO' => 'Finalizado',
            'MOD-DIRECTO' => 'Asignado', 'SIN-DATOS' => 'Completa', 'YA-CERRADA' => 'Finalizado',
        ], WorkOrder::orderBy('id')->pluck('estado', 'numero_wo')->all());
    }

    public function test_tecnico_directo_puede_cambiar_el_estado_de_su_propia_wo(): void
    {
        $tecnico = $this->usuario('tecnico', ['cedula' => '555', 'name' => 'Carlos Ruiz']);
        $wo = WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '555', 'estado' => 'Abierta']);
        $this->actingAs($tecnico);

        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Finalizado'])->assertOk();

        $wo->refresh();
        $this->assertSame('Finalizado', $wo->estado);
        $this->assertSame('555', $wo->cedula_tecnico_cierre);
        $this->assertSame('Carlos Ruiz', $wo->nombre_tecnico_cierre);
        $this->assertNotNull($wo->fecha_finalizacion);
    }

    public function test_cambiar_a_un_estado_que_no_es_finalizado_no_pone_fecha_finalizacion(): void
    {
        $tecnico = $this->usuario('tecnico', ['cedula' => '555']);
        $wo = WorkOrder::create(['numero_wo' => 'WO1B', 'numero_item' => '', 'cedula_tecnico' => '555', 'estado' => 'Abierta']);
        $this->actingAs($tecnico);

        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Asignado'])->assertOk();

        $this->assertSame('Asignado', $wo->fresh()->estado);
        $this->assertNull($wo->fresh()->fecha_finalizacion);
    }

    public function test_tecnico_indirecto_no_puede_cambiar_el_estado(): void
    {
        $aliado = Aliado::create(['tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900111222-1', 'nombre' => 'ALIADO SAS']);
        $tecnico = $this->usuario('tecnico', ['cedula' => '777', 'aliado_id' => $aliado->id]);
        $wo = WorkOrder::create(['numero_wo' => 'WO2', 'numero_item' => '', 'cedula_tecnico' => '777', 'estado' => 'Abierta']);
        $this->actingAs($tecnico);

        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Finalizado'])->assertForbidden();

        $wo->refresh();
        $this->assertSame('Abierta', $wo->estado);
        $this->assertNull($wo->cedula_tecnico_cierre);
    }

    public function test_tecnico_no_puede_cambiar_el_estado_de_una_wo_ajena(): void
    {
        $tecnico = $this->usuario('tecnico', ['cedula' => '555']);
        $ajena = WorkOrder::create(['numero_wo' => 'WO3', 'numero_item' => '', 'cedula_tecnico' => '666', 'estado' => 'Abierta']);
        $this->actingAs($tecnico);

        $this->putJson("/api/work-orders/{$ajena->id}", ['estado' => 'Finalizado'])->assertNotFound();

        $this->assertSame('Abierta', $ajena->fresh()->estado);
    }

    public function test_admin_puede_cambiar_el_estado_sin_que_se_registre_como_cierre_de_tecnico(): void
    {
        $wo = WorkOrder::create(['numero_wo' => 'WO4', 'numero_item' => '', 'cedula_tecnico' => '555', 'estado' => 'Abierta']);
        $this->actingAs($this->usuario('admin'));

        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Cancelada'])->assertOk();

        $wo->refresh();
        $this->assertSame('Cancelada', $wo->estado);
        $this->assertNull($wo->cedula_tecnico_cierre);
    }

    public function test_exporte_usa_quien_cerro_si_el_tecnico_asignado_es_directo(): void
    {
        $this->usuario('tecnico', ['cedula' => '555', 'tipo_vinculacion' => 'Directa']);
        WorkOrder::create([
            'numero_wo' => 'WO5', 'numero_item' => '', 'cedula_tecnico' => '555',
            'nombre_tecnico' => 'Técnico Importado', 'nombre_tecnico_cierre' => 'Carlos Ruiz', 'cedula_tecnico_cierre' => '555',
        ]);
        $this->actingAs($this->usuario('admin'));

        $wo = $this->getJson('/api/work-orders')->assertOk()->json()[0];

        $this->assertSame('Carlos Ruiz', $wo['nombre_tecnico_atiende']);
        $this->assertSame('555', $wo['cedula_tecnico_atiende']);
    }

    public function test_exporte_usa_el_tecnico_importado_si_nadie_la_ha_cerrado_desde_el_erp(): void
    {
        // La mayoría de WOs llegan ya cerradas en el archivo del proveedor (con su propio
        // "Técnico Atiende") y nunca pasan por el botón "Cambiar estado" de la app.
        $this->usuario('tecnico', ['cedula' => '555', 'tipo_vinculacion' => 'Directa']);
        WorkOrder::create([
            'numero_wo' => 'WO7', 'numero_item' => '', 'cedula_tecnico' => '555', 'estado' => 'Finalizado',
            'nombre_tecnico' => 'Técnico Importado', 'nombre_tecnico_cierre' => null, 'cedula_tecnico_cierre' => null,
        ]);
        $this->actingAs($this->usuario('admin'));

        $wo = $this->getJson('/api/work-orders')->assertOk()->json()[0];

        $this->assertSame('Técnico Importado', $wo['nombre_tecnico_atiende']);
        $this->assertSame('555', $wo['cedula_tecnico_atiende']);
    }

    public function test_exporte_usa_el_tecnico_agendado_si_el_asignado_es_indirecto_aunque_haya_cierre(): void
    {
        $aliado = Aliado::create(['tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900333444-1', 'nombre' => 'ALIADO SAS']);
        $this->usuario('tecnico', ['cedula' => '777', 'aliado_id' => $aliado->id]);
        WorkOrder::create([
            'numero_wo' => 'WO6', 'numero_item' => '', 'cedula_tecnico_agendado' => '777', 'tecnico_agendado' => 'Pedro Pérez',
            // No debería pasar en la práctica (un indirecto no puede cerrar su WO), pero si
            // quedó un cierre viejo igual debe primar el agendado, no el cierre.
            'nombre_tecnico_cierre' => 'Otro Técnico', 'cedula_tecnico_cierre' => '999',
        ]);
        $this->actingAs($this->usuario('admin'));

        $wo = $this->getJson('/api/work-orders')->assertOk()->json()[0];

        $this->assertSame('Pedro Pérez', $wo['nombre_tecnico_atiende']);
        $this->assertSame('777', $wo['cedula_tecnico_atiende']);
    }
}
