<?php

namespace Tests\Feature\Catalogos;

use App\Models\ProveedorWorkOrder;
use App\Models\Sede;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class SupervisoresTorresTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs($this->usuario('admin'));
    }

    public function test_un_admin_queda_como_supervisor_sin_perder_su_rol_ni_su_cargo(): void
    {
        $jefe = $this->usuario('admin', ['name' => 'Simon Admin', 'cargo' => 'ANALISTA ADMINISTRATIVO']);
        $tecnico = $this->usuario('tecnico', ['name' => 'Carlos Tecnico', 'cedula' => '555']);

        $this->postJson('/api/supervisores', ['user_id' => $jefe->id, 'item_ids' => [$tecnico->id]])
            ->assertCreated()
            ->assertJsonPath('nombre', 'Simon Admin')
            ->assertJsonPath('items.0.nombre', 'Carlos Tecnico');

        $jefe->refresh();
        $this->assertSame(['admin', 'ANALISTA ADMINISTRATIVO'], [$jefe->rol, $jefe->cargo]);
        $this->assertCount(1, $this->getJson('/api/supervisores')->assertOk()->json());
    }

    public function test_un_tecnico_solo_puede_tener_un_supervisor(): void
    {
        $uno = $this->usuario('general', ['name' => 'Ana Supervisora']);
        $dos = $this->usuario('general', ['name' => 'Beto Supervisor']);
        $tecnico = $this->usuario('tecnico', ['name' => 'Carlos Tecnico', 'cedula' => '555']);
        $this->postJson('/api/supervisores', ['user_id' => $uno->id, 'item_ids' => [$tecnico->id]])->assertCreated();

        $this->postJson('/api/supervisores', ['user_id' => $dos->id, 'item_ids' => [$tecnico->id]])
            ->assertUnprocessable()
            ->assertJsonPath('errors.item_ids.0', 'El técnico Carlos Tecnico ya está con Ana Supervisora. Quítalo de allá primero.');
        $this->postJson('/api/supervisores', ['user_id' => $uno->id, 'item_ids' => []])
            ->assertUnprocessable()->assertJsonPath('errors.user_id.0', 'Ese empleado ya es supervisor.');
    }

    public function test_editar_reemplaza_los_tecnicos_y_eliminar_los_libera(): void
    {
        $jefe = $this->usuario('general');
        $a = $this->usuario('tecnico', ['cedula' => '1']);
        $b = $this->usuario('tecnico', ['cedula' => '2']);
        $id = $this->postJson('/api/supervisores', ['user_id' => $jefe->id, 'item_ids' => [$a->id]])->json('id');

        $this->putJson("/api/supervisores/{$id}", ['item_ids' => [$b->id]])->assertOk()->assertJsonCount(1, 'items')->assertJsonPath('items.0.id', $b->id);
        $this->deleteJson("/api/supervisores/{$id}")->assertNoContent();

        $this->assertDatabaseCount('supervisor_tecnico', 0);
        $this->assertSame('general', $jefe->fresh()->rol);
    }

    public function test_una_sede_solo_puede_tener_una_torre(): void
    {
        $uno = $this->usuario('general', ['name' => 'Torre Uno']);
        $dos = $this->usuario('general', ['name' => 'Torre Dos']);
        $sede = Sede::create(['nombre' => 'SERVIMERCADEO CALI']);
        $this->postJson('/api/torres', ['user_id' => $uno->id, 'item_ids' => [$sede->id]])->assertCreated()->assertJsonPath('items.0.nombre', 'SERVIMERCADEO CALI');

        $this->postJson('/api/torres', ['user_id' => $dos->id, 'item_ids' => [$sede->id]])
            ->assertUnprocessable()
            ->assertJsonPath('errors.item_ids.0', 'La sede SERVIMERCADEO CALI ya está con Torre Uno. Quítalo de allá primero.');
    }

    public function test_las_opciones_solo_traen_empleados_de_directv(): void
    {
        $this->empleadoDe('Zzz De Directv', 'DIRECTV COL');
        $this->empleadoDe('Aaa De Directv', 'DIRECTV');
        $this->empleadoDe('Mmm De Tigo', 'TIGO EXPRESS');
        $this->usuario('general', ['name' => 'Bbb Sin Contrato']);
        $this->empleadoDe('Inactivo De Directv', 'DIRECTV')->update(['activo' => false]);

        $empleados = collect($this->getJson('/api/supervisores/opciones')->assertOk()->json('empleados'));

        // "DIRECTV COL" es el nombre viejo del mismo proyecto, así que también cuenta.
        $this->assertSame(['Aaa De Directv', 'Zzz De Directv'], $empleados->pluck('nombre')->all());
        $this->assertSame(['DIRECTV', 'DIRECTV'], $empleados->pluck('proyecto')->all());
    }

    public function test_el_proyecto_sale_del_contrato_actual_y_no_de_uno_viejo(): void
    {
        $contrato = fn ($user, $proyecto, $estado, $ingreso) => \App\Models\Contrato::create([
            'empleado_id' => $user->id, 'cliente_proyecto' => $proyecto, 'estado_contrato' => $estado, 'fecha_ingreso' => $ingreso,
        ]);

        // Fue de DIRECTV y reingresó a TIGO: ya no se ofrece.
        $aTigo = $this->usuario('general', ['name' => 'Paso A Tigo']);
        $contrato($aTigo, 'DIRECTV', 'Finalizado', '2025-01-10');
        $contrato($aTigo, 'TIGO EXPRESS', 'Vigente', '2026-06-01');

        // Al revés: fue de TIGO y hoy es de DIRECTV.
        $aDirectv = $this->usuario('general', ['name' => 'Paso A Directv']);
        $contrato($aDirectv, 'TIGO EXPRESS', 'Finalizado', '2025-01-10');
        $contrato($aDirectv, 'DIRECTV', 'Vigente', '2026-06-01');

        // El vigente manda aunque haya uno finalizado con fecha más nueva.
        $vigenteViejo = $this->usuario('general', ['name' => 'Vigente Viejo']);
        $contrato($vigenteViejo, 'DIRECTV', 'Vigente', '2024-03-01');
        $contrato($vigenteViejo, 'TIGO EXPRESS', 'Finalizado', '2026-02-01');

        $empleados = collect($this->getJson('/api/supervisores/opciones')->assertOk()->json('empleados'));

        $this->assertSame(['Paso A Directv', 'Vigente Viejo'], $empleados->pluck('nombre')->all());
    }

    /** Un empleado activo con contrato de ese proyecto. */
    private function empleadoDe(string $nombre, string $proyecto): \App\Models\User
    {
        $user = $this->usuario('general', ['name' => $nombre]);
        \App\Models\Contrato::create(['empleado_id' => $user->id, 'cliente_proyecto' => $proyecto]);

        return $user;
    }

    public function test_a_un_supervisor_se_le_asigna_cualquier_persona_de_directv_no_solo_tecnicos(): void
    {
        $this->empleadoDe('Activo', 'DIRECTV')->update(['cedula' => '111']);
        $this->empleadoDe('Inactivo', 'DIRECTV')->update(['activo' => false]);
        // Un técnico que no es de DIRECTV ya no se ofrece; el rol dejó de decidir.
        $this->usuario('tecnico', ['name' => 'Carlos Tecnico De Tigo', 'cedula' => '555']);
        Sede::create(['nombre' => 'SEDE A']);

        $sup = $this->getJson('/api/supervisores/opciones')->assertOk()->json();
        $this->assertSame(['Activo'], array_column($sup['empleados'], 'nombre'));
        $this->assertSame(['Activo (111)'], array_column($sup['items'], 'nombre'));

        $this->assertSame(['SEDE A'], array_column($this->getJson('/api/torres/opciones')->assertOk()->json('items'), 'nombre'));
    }

    public function test_el_listado_de_personas_de_directv_sirve_para_el_parametro_auxiliar(): void
    {
        $this->empleadoDe('Zoe De Directv', 'DIRECTV')->update(['cargo' => 'ASESOR COMERCIAL']);
        $this->empleadoDe('Ana De Tigo', 'TIGO EXPRESS');
        $this->usuario('general', ['name' => 'Sin Contrato']);

        $personas = $this->getJson('/api/personas-directv')->assertOk()->json();

        $this->assertSame(['Zoe De Directv'], array_column($personas, 'nombre'));
        $this->assertSame('ASESOR COMERCIAL', $personas[0]['cargo']);
    }

    public function test_el_exporte_saca_supervisor_por_tecnico_y_torre_por_sede(): void
    {
        $jefe = $this->usuario('admin', ['name' => 'Simon Supervisor']);
        $torre = $this->usuario('general', ['name' => 'Laura Torre']);
        $conSupervisor = $this->usuario('tecnico', ['cedula' => '555']);
        $this->usuario('tecnico', ['cedula' => '666', 'jefe_inmediato' => 'Jefe De Ficha']);
        $cali = Sede::create(['nombre' => 'SERVIMERCADEO CALI']);
        ProveedorWorkOrder::create(['sede_id' => $cali->id, 'codigo' => 'CO-I004283', 'nombre' => 'CO-I004283-SERVIMERCADEO CALI']);
        $this->postJson('/api/supervisores', ['user_id' => $jefe->id, 'item_ids' => [$conSupervisor->id]])->assertCreated();
        $this->postJson('/api/torres', ['user_id' => $torre->id, 'item_ids' => [$cali->id]])->assertCreated();

        WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '555', 'proveedor' => 'CO-I004283-SERVIMERCADEO CALI']);
        WorkOrder::create(['numero_wo' => 'WO2', 'numero_item' => '', 'cedula_tecnico' => '666', 'proveedor' => 'OTRO', 'torre' => 'Torre Del Archivo']);

        $wos = collect($this->getJson('/api/work-orders')->assertOk()->json())->keyBy('numero_wo');

        $this->assertSame(['Simon Supervisor', 'Laura Torre'], [$wos['WO1']['supervisor_tecnico'], $wos['WO1']['torre_sede']]);
        $this->assertSame(['Jefe De Ficha', null], [$wos['WO2']['supervisor_tecnico'], $wos['WO2']['torre_sede']]);
    }

    public function test_un_tecnico_no_ve_ni_edita_supervisores_si_se_le_niega_la_pestana(): void
    {
        \Illuminate\Support\Facades\DB::table('permisos_denegados')->insert([
            'rol' => 'tecnico', 'modulo_id' => 'parametros', 'submodulo_id' => 'paramgrupo_operativos',
            'archivo_id' => 'supervisores_file', 'accion' => '', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->app['auth']->forgetGuards();
        $this->actingAs($this->usuario('tecnico', ['cedula' => '555']));

        $this->getJson('/api/supervisores')->assertForbidden();
        $this->postJson('/api/supervisores', ['user_id' => 1, 'item_ids' => []])->assertForbidden();
    }
}
