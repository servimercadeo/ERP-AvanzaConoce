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

    public function test_reimportar_no_cambia_la_fecha_de_finalizacion_de_lo_que_un_directo_ya_cerro(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        $this->importar(['cedula_tecnico' => '555', 'fecha_finalizacion' => '2026-09-25 10:00:00']);
        WorkOrder::where('numero_wo', 'WO1')->update(['estado' => 'Finalizado', 'fecha_finalizacion' => '2026-11-02 08:00:00']);

        $this->importar(['cedula_tecnico' => '555', 'fecha_finalizacion' => '2026-09-25 10:00:00']);

        $this->assertStringStartsWith('2026-11-02', (string) WorkOrder::where('numero_wo', 'WO1')->value('fecha_finalizacion'));
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

    public function test_filtra_por_tecnicos_directos_e_indirectos(): void
    {
        $this->tecnicoAliado('777');
        $this->usuario('tecnico', ['cedula' => '555']);
        $crear = fn (string $wo, array $datos) => WorkOrder::create($datos + ['numero_wo' => $wo, 'numero_item' => '']);
        $crear('USUARIO-DIRECTO', ['cedula_tecnico' => '555']);
        $crear('USUARIO-ALIADO', ['cedula_tecnico' => '777']);
        $crear('AGENDADO-ALIADO', ['cedula_tecnico' => '555', 'cedula_tecnico_agendado' => '777']);
        $crear('AGENDADO-VACIO', ['cedula_tecnico' => '555', 'cedula_tecnico_agendado' => '']);
        $crear('USUARIO-MANDA', ['cedula_tecnico' => '555', 'modalidad' => 'ALIADO']);
        $crear('MODALIDAD-DIRECTO', ['cedula_tecnico' => '999', 'modalidad' => ' directo ']);
        $crear('MODALIDAD-ALIADO', ['cedula_tecnico' => '999', 'modalidad' => 'ALIADO']);
        $crear('SIN-CEDULA', ['modalidad' => 'ALIADO']);
        $crear('SIN-DATOS', ['cedula_tecnico' => '999']);
        $this->actingAs($this->usuario('admin'));

        $numeros = fn (string $url) => collect($this->getJson($url)->assertOk()->json())->pluck('numero_wo')->sort()->values()->all();

        $this->assertSame(
            ['AGENDADO-VACIO', 'MODALIDAD-DIRECTO', 'USUARIO-DIRECTO', 'USUARIO-MANDA'],
            $numeros('/api/work-orders?tipo_tecnico=directo'),
        );
        $this->assertSame(
            ['AGENDADO-ALIADO', 'MODALIDAD-ALIADO', 'SIN-CEDULA', 'USUARIO-ALIADO'],
            $numeros('/api/work-orders?tipo_tecnico=indirecto'),
        );
        $this->assertCount(9, $numeros('/api/work-orders'));
        $this->assertCount(9, $numeros('/api/work-orders?tipo_tecnico=otro'));
    }

    public function test_el_filtro_de_tipo_se_combina_con_los_demas_y_con_la_paginacion(): void
    {
        $crear = fn (string $wo, array $datos) => WorkOrder::create($datos + ['numero_wo' => $wo, 'numero_item' => '', 'cedula_tecnico' => '999']);
        $crear('D1', ['modalidad' => 'DIRECTO', 'estado' => 'Asignado']);
        $crear('D2', ['modalidad' => 'DIRECTO', 'estado' => 'Finalizado']);
        $crear('A1', ['modalidad' => 'ALIADO', 'estado' => 'Finalizado']);
        $this->actingAs($this->usuario('admin'));

        $this->getJson('/api/work-orders?tipo_tecnico=directo&estado=Finalizado&page=1')->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.numero_wo', 'D2');
    }

    public function test_exporte_fecha_de_cierre_solo_para_directos_finalizados(): void
    {
        $this->tecnicoAliado('777');
        $this->usuario('tecnico', ['cedula' => '555']);
        $crear = fn (string $wo, array $datos) => WorkOrder::create($datos + ['numero_wo' => $wo, 'numero_item' => '', 'fecha_finalizacion' => '2026-11-02 10:15:00']);
        $crear('DIRECTO-CERRADA', ['cedula_tecnico' => '555', 'estado' => 'Finalizado']);
        $crear('DIRECTO-ABIERTA', ['cedula_tecnico' => '555', 'estado' => 'Asignado']);
        $crear('ALIADO-USUARIO', ['cedula_tecnico' => '777', 'estado' => 'Finalizado']);
        $crear('ALIADO-MODALIDAD', ['cedula_tecnico' => '999', 'modalidad' => 'ALIADO', 'estado' => 'Finalizado']);
        $crear('DIRECTO-MODALIDAD', ['cedula_tecnico' => '999', 'modalidad' => 'DIRECTO', 'estado' => 'Finalizado']);
        $this->actingAs($this->usuario('admin'));

        $fechas = collect($this->getJson('/api/work-orders')->assertOk()->json())->pluck('fecha_cierre_tecnico', 'numero_wo')->sortKeys()->all();

        $this->assertSame([
            'ALIADO-MODALIDAD' => null, 'ALIADO-USUARIO' => null, 'DIRECTO-ABIERTA' => null,
            'DIRECTO-CERRADA' => '2026-11-02 10:15', 'DIRECTO-MODALIDAD' => '2026-11-02 10:15',
        ], $fechas);
    }

    public function test_exporte_el_tecnico_de_un_aliado_sin_usuario_es_el_agendado(): void
    {
        WorkOrder::create([
            'numero_wo' => 'WO8', 'numero_item' => '', 'cedula_tecnico' => '999', 'modalidad' => 'ALIADO',
            'tecnico_agendado' => 'Pedro Aliado', 'nombre_tecnico' => 'Nombre TH', 'cedula_tecnico_agendado' => '888',
        ]);
        WorkOrder::create(['numero_wo' => 'WO9', 'numero_item' => '', 'nombre_tecnico' => 'Sin Cedula']);
        $this->actingAs($this->usuario('admin'));

        $wos = collect($this->getJson('/api/work-orders')->assertOk()->json())->keyBy('numero_wo');

        $this->assertSame('Pedro Aliado', $wos['WO8']['nombre_tecnico_atiende']);
        $this->assertSame('Sin Cedula', $wos['WO9']['nombre_tecnico_atiende']);
    }

    /** Un empleado activo con contrato de ese proyecto (de ahí sale "DIRECTV"). */
    private function empleadoDe(string $nombre, string $proyecto): \App\Models\User
    {
        $user = $this->usuario('general', ['name' => $nombre]);
        \App\Models\Contrato::create(['empleado_id' => $user->id, 'cliente_proyecto' => $proyecto]);

        return $user;
    }

    /** Un valor del parámetro Parametros > Operativos > Auxiliar. */
    private function auxiliar(string $nombre): \App\Models\ValorParametro
    {
        $tipo = \App\Models\TipoParametro::firstOrCreate(['nombre' => 'Auxiliar'], ['grupo' => 'Operativos']);

        return \App\Models\ValorParametro::create(['tipo_parametro_id' => $tipo->id, 'nombre' => $nombre]);
    }

    public function test_el_directo_debe_indicar_como_atendio_al_finalizar(): void
    {
        $tecnico = $this->usuario('tecnico', ['cedula' => '555']);
        $wo = WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '555', 'estado' => 'Asignado']);
        $this->actingAs($tecnico);

        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Finalizado'])
            ->assertUnprocessable()->assertJsonPath('errors.modo_atencion.0', 'Indica si el técnico atendió SOLO o ACOMPAÑADO.');
        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Finalizado', 'modo_atencion' => 'CON OTRO'])->assertUnprocessable();
        $this->assertSame('Asignado', $wo->fresh()->estado);

        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Finalizado', 'modo_atencion' => 'SOLO'])->assertOk();

        $wo->refresh();
        $this->assertSame(['Finalizado', 'SOLO', null], [$wo->estado, $wo->modo_atencion, $wo->auxiliar]);
    }

    public function test_acompanado_exige_un_auxiliar_tecnico_valido(): void
    {
        $tecnico = $this->usuario('tecnico', ['cedula' => '555']);
        $auxiliar = $this->auxiliar('Laura Auxiliar');
        $otro = \App\Models\ValorParametro::create([
            'tipo_parametro_id' => \App\Models\TipoParametro::create(['nombre' => 'Otro catálogo', 'grupo' => 'Operativos'])->id,
            'nombre' => 'No Es Auxiliar',
        ]);
        $wo = WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '555', 'estado' => 'Asignado']);
        $this->actingAs($tecnico);

        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Finalizado', 'modo_atencion' => 'ACOMPAÑADO'])
            ->assertUnprocessable()->assertJsonPath('errors.auxiliar_id.0', 'Selecciona el auxiliar técnico que lo acompañó.');
        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Finalizado', 'modo_atencion' => 'ACOMPAÑADO', 'auxiliar_id' => "p-{$otro->id}"])
            ->assertUnprocessable();

        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Finalizado', 'modo_atencion' => 'ACOMPAÑADO', 'auxiliar_id' => "p-{$auxiliar->id}"])->assertOk();

        $wo->refresh();
        $this->assertSame(['ACOMPAÑADO', 'Laura Auxiliar'], [$wo->modo_atencion, $wo->auxiliar]);
    }

    public function test_finalizar_la_wo_de_un_aliado_no_pide_ni_guarda_como_atendio(): void
    {
        $wo = WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '999', 'modalidad' => 'ALIADO', 'estado' => 'Asignado']);
        $this->actingAs($this->usuario('admin'));

        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Finalizado', 'modo_atencion' => 'SOLO'])->assertOk();

        $this->assertNull($wo->fresh()->modo_atencion);
    }

    public function test_pasar_a_asignado_no_pide_como_atendio(): void
    {
        $tecnico = $this->usuario('tecnico', ['cedula' => '555']);
        $wo = WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '555', 'estado' => 'Finalizado']);
        $this->actingAs($tecnico);

        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Asignado'])->assertOk();
    }

    public function test_la_lista_de_auxiliares_trae_los_de_directv_y_el_parametro_y_nadie_mas(): void
    {
        $this->empleadoDe('Zulma De Directv', 'DIRECTV');
        $this->empleadoDe('Ana De Directv', 'DIRECTV');
        $this->empleadoDe('Nelly De Tigo', 'TIGO EXPRESS');
        $this->usuario('general', ['name' => 'Beto Sin Contrato']);
        $this->empleadoDe('Inactiva De Directv', 'DIRECTV')->update(['activo' => false]);
        $this->auxiliar('Carla Del Parametro');
        \App\Models\ValorParametro::create([
            'tipo_parametro_id' => \App\Models\TipoParametro::create(['nombre' => 'Otro catálogo', 'grupo' => 'Operativos'])->id,
            'nombre' => 'De Otro Catalogo',
        ]);
        $this->actingAs($this->usuario('tecnico', ['cedula' => '555', 'name' => 'Aaa Tecnico']));

        $nombres = collect($this->getJson('/api/work-orders/auxiliares')->assertOk()->json())->pluck('nombre')->all();

        // Solo los de DIRECTV, por nombre, y al final lo que se agregó en el parámetro.
        $this->assertSame(['Ana De Directv', 'Zulma De Directv', 'Carla Del Parametro'], $nombres);
    }

    public function test_un_empleado_de_directv_se_puede_elegir_como_auxiliar(): void
    {
        $tecnico = $this->usuario('tecnico', ['cedula' => '555']);
        $auxiliar = $this->empleadoDe('Zulma De Directv', 'DIRECTV');
        $wo = WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '555', 'estado' => 'Asignado']);
        $this->actingAs($tecnico);

        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Finalizado', 'modo_atencion' => 'ACOMPAÑADO', 'auxiliar_id' => "u-{$auxiliar->id}"])->assertOk();

        $this->assertSame('Zulma De Directv', $wo->fresh()->auxiliar);
    }

    public function test_un_auxiliar_nuevo_del_parametro_queda_disponible_de_una(): void
    {
        $tecnico = $this->usuario('tecnico', ['cedula' => '555']);
        $wo = WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '555', 'estado' => 'Asignado']);
        $tipo = \App\Models\TipoParametro::firstOrCreate(['nombre' => 'Auxiliar'], ['grupo' => 'Operativos']);
        $this->actingAs($this->usuario('admin'));

        $id = $this->postJson('/api/valores-parametro', ['tipo_parametro_id' => $tipo->id, 'nombre' => 'Nuevo Auxiliar'])
            ->assertCreated()->json('id');

        $this->app['auth']->forgetGuards();
        $this->actingAs($tecnico);
        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Finalizado', 'modo_atencion' => 'ACOMPAÑADO', 'auxiliar_id' => "p-{$id}"])->assertOk();

        $this->assertSame('Nuevo Auxiliar', $wo->fresh()->auxiliar);
    }

    public function test_la_pagina_dice_si_la_wo_es_de_directo_o_aliado(): void
    {
        $this->tecnicoAliado('777');
        $this->usuario('tecnico', ['cedula' => '555']);
        WorkOrder::create(['numero_wo' => 'WO-D', 'numero_item' => '', 'cedula_tecnico' => '555']);
        WorkOrder::create(['numero_wo' => 'WO-A', 'numero_item' => '', 'cedula_tecnico' => '777']);
        WorkOrder::create(['numero_wo' => 'WO-M', 'numero_item' => '', 'cedula_tecnico' => '999', 'modalidad' => 'directo']);
        $this->actingAs($this->usuario('admin'));

        $tipos = collect($this->getJson('/api/work-orders?page=1')->assertOk()->json('data'))->pluck('tipo_tecnico', 'numero_wo')->sortKeys()->all();

        $this->assertSame(['WO-A' => 'ALIADO', 'WO-D' => 'DIRECTO', 'WO-M' => 'DIRECTO'], $tipos);
    }

    public function test_exporte_modo_y_auxiliar_solo_de_directos_y_reimportar_no_los_pisa(): void
    {
        $this->usuario('tecnico', ['cedula' => '555']);
        WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '1', 'cedula_tecnico' => '555', 'estado' => 'Finalizado', 'modo_atencion' => 'ACOMPAÑADO', 'auxiliar' => 'Laura Auxiliar']);
        WorkOrder::create(['numero_wo' => 'WO2', 'numero_item' => '', 'cedula_tecnico' => '999', 'modalidad' => 'ALIADO', 'estado' => 'Finalizado', 'modo_atencion' => 'SOLO', 'auxiliar' => 'Del Archivo']);
        $this->importar(['numero_item' => '1', 'cedula_tecnico' => '555', 'modo_atencion' => 'SOLO', 'auxiliar' => '']);

        $wos = collect($this->getJson('/api/work-orders')->assertOk()->json())->keyBy('numero_wo');

        $this->assertSame(['ACOMPAÑADO', 'Laura Auxiliar'], [$wos['WO1']['modo_atencion_directo'], $wos['WO1']['auxiliar_directo']]);
        $this->assertSame([null, null], [$wos['WO2']['modo_atencion_directo'], $wos['WO2']['auxiliar_directo']]);
    }

    public function test_exporte_conductor_es_el_tecnico_que_atendio_y_tipo_auxilio_su_vehiculo(): void
    {
        $this->tecnicoAliado('777');
        $directo = $this->usuario('tecnico', ['cedula' => '555', 'name' => 'Carlos Ruiz']);
        $sinVehiculo = $this->usuario('tecnico', ['cedula' => '444', 'name' => 'Ana Sin Carro']);
        \App\Models\Vehiculo::create(['tipo' => 'Moto', 'placa' => 'ABC123', 'tecnico_asignado_id' => $directo->id]);
        $crear = fn (string $wo, array $datos) => WorkOrder::create($datos + ['numero_wo' => $wo, 'numero_item' => '']);
        $crear('DIRECTO', ['cedula_tecnico' => '555', 'estado' => 'Finalizado', 'nombre_tecnico_cierre' => 'Carlos Ruiz']);
        $crear('SIN-VEHICULO', ['cedula_tecnico' => '444', 'nombre_tecnico' => 'Ana Sin Carro']);
        $crear('ALIADO', ['cedula_tecnico' => '777', 'tecnico_agendado' => 'Pedro Aliado']);
        $this->actingAs($this->usuario('admin'));

        $wos = collect($this->getJson('/api/work-orders')->assertOk()->json())->keyBy('numero_wo');

        $this->assertSame(['Carlos Ruiz', 'Moto'], [$wos['DIRECTO']['conductor_tecnico'], $wos['DIRECTO']['tipo_auxilio_vehiculo']]);
        $this->assertSame(['Ana Sin Carro', 'N/A'], [$wos['SIN-VEHICULO']['conductor_tecnico'], $wos['SIN-VEHICULO']['tipo_auxilio_vehiculo']]);
        $this->assertSame(['Pedro Aliado', 'N/A'], [$wos['ALIADO']['conductor_tecnico'], $wos['ALIADO']['tipo_auxilio_vehiculo']]);
    }

    public function test_tecnico_directo_puede_cambiar_el_estado_de_su_propia_wo(): void
    {
        $tecnico = $this->usuario('tecnico', ['cedula' => '555', 'name' => 'Carlos Ruiz']);
        $wo = WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '555', 'estado' => 'Abierta']);
        $this->actingAs($tecnico);

        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Finalizado', 'modo_atencion' => 'SOLO'])->assertOk();

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
            'numero_wo' => 'WO6', 'numero_item' => '', 'cedula_tecnico' => '777', 'cedula_tecnico_agendado' => '777', 'tecnico_agendado' => 'Pedro Pérez',
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
