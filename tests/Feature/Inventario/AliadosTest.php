<?php

namespace Tests\Feature\Inventario;

use App\Models\Aliado;
use App\Models\Proyecto;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class AliadosTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    /** Ids de Parámetros > Proyectos, por nombre. */
    private array $proyecto = [];

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['DIRECTV', 'HUGHES COL', 'TIGO HOME', 'TIGO EXPRESS', 'ADMINISTRATIVO'] as $nombre) {
            $this->proyecto[$nombre] = Proyecto::firstOrCreate(['nombre' => $nombre], ['activo' => true])->id;
        }
    }

    private function empresa(array $extra = []): array
    {
        return array_merge([
            'tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900123456-7',
            'nombre' => 'TECNOMARIN S.A.S', 'telefono' => '3001112233', 'ciudad' => 'MEDELLIN',
            'proyectos' => [$this->proyecto['DIRECTV'], $this->proyecto['HUGHES COL']],
        ], $extra);
    }

    private function persona(array $extra = []): array
    {
        return array_merge([
            'cedula' => '1020304050', 'nombres' => 'Pedro', 'apellidos' => 'Pérez',
            'movil' => '3104445566', 'email' => 'pedro.perez@test.co',
            'tipo_documento' => 'CC', 'proyectos' => [$this->proyecto['DIRECTV']],
        ], $extra);
    }

    private function nombresProyectos($respuesta, string $ruta = 'aliado.proyectos'): array
    {
        return collect($respuesta->json($ruta))->pluck('nombre')->sort()->values()->all();
    }

    public function test_aliado_tipo_empresa_crea_solo_el_aliado(): void
    {
        $this->actuarComo('admin');

        $this->postJson('/api/aliados', $this->empresa())
            ->assertCreated()->assertJsonPath('credenciales', null);

        $aliado = Aliado::firstOrFail();
        $this->assertSame('empresa', $aliado->tipo);
        $this->assertSame(0, $aliado->tecnicos()->count());
    }

    public function test_aliado_tipo_tecnico_crea_el_aliado_y_su_usuario_tecnico_con_los_mismos_datos(): void
    {
        $this->actuarComo('admin');

        $credenciales = $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona(['ciudad' => 'CALI']))
            ->assertCreated()->json('credenciales');

        $aliado = Aliado::firstOrFail();
        $this->assertSame(['tecnico', 'CC', '1020304050', 'PEDRO PÉREZ'], [$aliado->tipo, $aliado->tipo_documento, $aliado->documento, $aliado->nombre]);

        $tecnico = User::where('cedula', '1020304050')->firstOrFail();
        $this->assertSame([$aliado->id, 'tecnico', 'PEDRO', 'PÉREZ', 'pedro.perez@test.co', 'Indirecto'],
            [$tecnico->aliado_id, $tecnico->rol, $tecnico->nombres, $tecnico->apellidos, $tecnico->email, $tecnico->tipo_vinculacion]);
        $this->assertTrue($tecnico->activo && !$tecnico->pendiente_alta);

        // Con las credenciales que se le muestran puede entrar al ERP.
        $this->assertSame('pedro.perez@test.co', $credenciales['email']);
        $this->assertTrue(Hash::check($credenciales['password'], $tecnico->password));
    }

    public function test_guarda_el_tipo_de_documento_y_los_proyectos(): void
    {
        $this->actuarComo('admin');

        $r = $this->postJson('/api/aliados', $this->empresa())->assertCreated();
        $this->assertSame(['DIRECTV', 'HUGHES COL'], $this->nombresProyectos($r));
        $r = $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona([
            'tipo_documento' => 'CE', 'proyectos' => [$this->proyecto['TIGO HOME'], $this->proyecto['TIGO EXPRESS']],
        ]))->assertCreated()->assertJsonPath('aliado.tipo_documento', 'CE');
        $this->assertSame(['TIGO EXPRESS', 'TIGO HOME'], $this->nombresProyectos($r));

        // Filtro por proyecto (id): cada aliado aparece en los proyectos que marcó.
        $nombres = fn (string $p) => collect($this->getJson('/api/aliados?proyecto=' . $this->proyecto[$p])->json())->pluck('nombre')->all();
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('HUGHES COL'));
        $this->assertSame(['PEDRO PÉREZ'], $nombres('TIGO HOME'));
        $this->assertSame(['PEDRO PÉREZ'], $nombres('TIGO EXPRESS'));
    }

    public function test_lista_por_paginas_de_10_con_resumen_de_todos_los_filtrados(): void
    {
        $this->actuarComo('admin');
        foreach (range(1, 12) as $i) {
            $this->postJson('/api/aliados', $this->empresa(['documento' => "90000000{$i}", 'nombre' => sprintf('EMPRESA %02d', $i)]))->assertCreated();
        }
        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona())->assertCreated();

        $p1 = $this->getJson('/api/aliados?page=1')->assertOk();
        $this->assertCount(10, $p1->json('data'));
        $this->assertSame([13, 2, 10], [$p1->json('total'), $p1->json('last_page'), $p1->json('per_page')]);
        $this->assertSame(['aliados' => 13, 'empresa' => 12, 'tecnico' => 1, 'tecnicos' => 1], $p1->json('resumen'));
        $this->assertSame('EMPRESA 01', $p1->json('data.0.nombre'));
        $this->assertArrayHasKey('work_orders', $p1->json('data.0'));

        $p2 = $this->getJson('/api/aliados?page=2')->assertOk();
        $this->assertSame(['EMPRESA 11', 'EMPRESA 12', 'PEDRO PÉREZ'], collect($p2->json('data'))->pluck('nombre')->all());

        // El resumen y el total siguen a los filtros, no a la página.
        $soloTecnicos = $this->getJson('/api/aliados?page=1&tipo=tecnico')->assertOk();
        $this->assertSame(1, $soloTecnicos->json('total'));
        $this->assertSame(['aliados' => 1, 'empresa' => 0, 'tecnico' => 1, 'tecnicos' => 1], $soloTecnicos->json('resumen'));
    }

    public function test_filtros_de_busqueda_tipo_y_proyecto_combinados(): void
    {
        $this->actuarComo('admin');
        $empresa = $this->postJson('/api/aliados', $this->empresa())->assertCreated()->json('aliado.id');
        $this->postJson("/api/aliados/{$empresa}/tecnicos", $this->persona(['cedula' => '1111222233', 'nombres' => 'Laura', 'apellidos' => 'Gómez', 'email' => 'laura@test.co', 'movil' => '3109998877']))->assertCreated();
        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona([
            'proyectos' => [$this->proyecto['TIGO HOME']],
        ]))->assertCreated();

        $nombres = fn (string $query) => collect($this->getJson('/api/aliados?page=1&' . $query)->assertOk()->json('data'))->pluck('nombre')->sort()->values()->all();

        $this->assertSame(['PEDRO PÉREZ', 'TECNOMARIN S.A.S'], $nombres(''));
        // Búsqueda: por nombre, documento, nombre del técnico o su cédula.
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('search=tecnomarin'));
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('search=900123'));
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('search=LAURA'));
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('search=1111222233'));
        $this->assertSame(['PEDRO PÉREZ'], $nombres('search=1020304050'));
        $this->assertSame([], $nombres('search=nadie'));
        // Tipo.
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('tipo=empresa'));
        $this->assertSame(['PEDRO PÉREZ'], $nombres('tipo=tecnico'));
        // Proyecto.
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('proyecto=' . $this->proyecto['DIRECTV']));
        $this->assertSame(['PEDRO PÉREZ'], $nombres('proyecto=' . $this->proyecto['TIGO HOME']));
        $this->assertSame([], $nombres('proyecto=' . $this->proyecto['TIGO EXPRESS']));
        // Combinados: la búsqueda por técnico no se salta los demás filtros.
        $this->assertSame([], $nombres('search=LAURA&tipo=tecnico'));
        $this->assertSame([], $nombres('search=LAURA&proyecto=' . $this->proyecto['TIGO HOME']));
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('search=LAURA&tipo=empresa&proyecto=' . $this->proyecto['HUGHES COL']));
    }

    public function test_los_proyectos_salen_de_parametros_sin_administrativo_y_un_renombre_se_refleja(): void
    {
        $this->actuarComo('admin');
        Proyecto::firstOrCreate(['nombre' => 'PROYECTO INACTIVO'], ['activo' => false]);

        $opciones = collect($this->getJson('/api/aliados/proyectos')->assertOk()->json())->pluck('nombre');
        $this->assertTrue($opciones->contains('HUGHES COL') && $opciones->contains('TIGO HOME'));
        $this->assertFalse($opciones->contains('ADMINISTRATIVO'));
        $this->assertFalse($opciones->contains('PROYECTO INACTIVO'));

        $id = $this->postJson('/api/aliados', $this->empresa())->assertCreated()->json('aliado.id');

        // Si en Parámetros se renombra el proyecto, el aliado lo muestra con el nombre nuevo.
        Proyecto::whereKey($this->proyecto['HUGHES COL'])->update(['nombre' => 'HUGHES COLOMBIA']);
        $this->assertSame(['DIRECTV', 'HUGHES COLOMBIA'], $this->nombresProyectos($this->getJson("/api/aliados/{$id}"), 'proyectos'));
    }

    public function test_editar_cambia_los_proyectos(): void
    {
        $this->actuarComo('admin');
        $id = $this->postJson('/api/aliados', $this->empresa())->assertCreated()->json('aliado.id');

        $r = $this->putJson("/api/aliados/{$id}", $this->empresa(['proyectos' => [$this->proyecto['TIGO EXPRESS']]]))->assertOk();
        $this->assertSame(['TIGO EXPRESS'], $this->nombresProyectos($r, 'proyectos'));
    }

    public function test_el_proyecto_es_obligatorio_y_debe_ser_valido(): void
    {
        $this->actuarComo('admin');

        $this->postJson('/api/aliados', $this->empresa(['proyectos' => []]))->assertStatus(422)->assertJsonValidationErrors('proyectos');
        $this->postJson('/api/aliados', $this->empresa(['proyectos' => [999999]]))->assertStatus(422)->assertJsonValidationErrors('proyectos.0');
        // ADMINISTRATIVO no se le asigna a un aliado.
        $this->postJson('/api/aliados', $this->empresa(['proyectos' => [$this->proyecto['ADMINISTRATIVO']]]))->assertStatus(422)->assertJsonValidationErrors('proyectos.0');
        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona(['proyectos' => null]))->assertStatus(422)->assertJsonValidationErrors('proyectos');
        $this->postJson('/api/aliados', $this->empresa(['tipo_documento' => 'PASAPORTE']))->assertStatus(422)->assertJsonValidationErrors('tipo_documento');
        $this->assertSame(0, Aliado::count());
    }

    public function test_aliado_indirecto_con_nit_queda_con_su_cedula_en_el_usuario_tecnico(): void
    {
        $this->actuarComo('admin');

        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona(['tipo_documento' => 'NIT', 'cedula' => '1020304050-3']))
            ->assertCreated()->assertJsonPath('aliado.documento', '1020304050-3');

        $this->assertSame('1020304050', User::where('aliado_id', Aliado::value('id'))->value('cedula'));

        // Con cédula (CC o CE) no se acepta el guion del dígito de verificación.
        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona(['cedula' => '555666777-1', 'email' => 'otro@test.co', 'movil' => '3201234567']))
            ->assertStatus(422)->assertJsonValidationErrors('cedula');
    }

    public function test_tecnico_sin_correo_usa_el_correo_tecnico_de_su_cedula(): void
    {
        $this->actuarComo('admin');

        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona(['email' => null]))
            ->assertCreated()->assertJsonPath('credenciales.email', '1020304050@avanzaconoce.com');
    }

    public function test_a_la_empresa_se_le_agregan_tecnicos_despues_y_al_tipo_tecnico_no(): void
    {
        $this->actuarComo('admin');
        $empresa = Aliado::create($this->empresa());
        $tecnicoAliado = Aliado::create(['tipo' => 'tecnico', 'tipo_documento' => 'CC', 'documento' => '777', 'nombre' => 'SOLO']);

        $this->postJson("/api/aliados/{$empresa->id}/tecnicos", $this->persona())->assertCreated();
        $this->postJson("/api/aliados/{$empresa->id}/tecnicos", $this->persona(['cedula' => '5556667778', 'movil' => '3157778899', 'email' => 'simon@test.co']))->assertCreated();
        $this->assertSame(2, $empresa->tecnicos()->count());

        $this->postJson("/api/aliados/{$tecnicoAliado->id}/tecnicos", $this->persona(['cedula' => '999888777', 'movil' => '3201112222', 'email' => 'otro@test.co']))
            ->assertStatus(422);
    }

    public function test_no_reutiliza_la_cedula_de_un_empleado_y_no_deja_el_aliado_a_medias(): void
    {
        $this->actuarComo('admin');
        $this->usuario('general', ['cedula' => '1020304050', 'email' => 'empleado@test.co']);

        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona())
            ->assertStatus(422)->assertJsonValidationErrors('cedula');

        $this->assertSame(0, Aliado::count());
        $this->assertNull(User::where('cedula', '1020304050')->value('aliado_id'));
    }

    public function test_documento_de_aliado_repetido_se_rechaza(): void
    {
        $this->actuarComo('admin');
        Aliado::create($this->empresa());

        $this->postJson('/api/aliados', $this->empresa(['nombre' => 'OTRA']))
            ->assertStatus(422)->assertJsonValidationErrors('documento');
    }

    public function test_cuenta_las_work_orders_de_sus_tecnicos_por_estado_sin_duplicar_items(): void
    {
        $this->actuarComo('admin');
        $empresa = Aliado::create($this->empresa());
        $this->postJson("/api/aliados/{$empresa->id}/tecnicos", $this->persona())->assertCreated();

        // WO1 trae dos ítems: cuenta una vez.
        WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '1', 'estado' => 'Finalizado', 'cedula_tecnico' => '1020304050']);
        WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '2', 'estado' => 'Finalizado', 'cedula_tecnico' => '1020304050']);
        WorkOrder::create(['numero_wo' => 'WO2', 'numero_item' => '', 'estado' => 'Atendido', 'cedula_tecnico' => '1020304050']);
        WorkOrder::create(['numero_wo' => 'WO3', 'numero_item' => '', 'estado' => 'Finalizado', 'cedula_tecnico' => '4444444']);

        $this->getJson('/api/aliados')->assertOk()
            ->assertJsonPath('0.work_orders', ['asignadas' => 2, 'atendidas' => 1, 'finalizadas' => 1])
            ->assertJsonPath('0.tecnicos_count', 1);

        $this->getJson("/api/aliados/{$empresa->id}")->assertOk()
            ->assertJsonPath('tecnicos.0.work_orders.asignadas', 2);

        $this->assertCount(3, $this->getJson("/api/aliados/{$empresa->id}/work-orders")->json());
        $this->assertSame(['WO2'], collect($this->getJson("/api/aliados/{$empresa->id}/work-orders?estado=atendidas")->json())->pluck('numero_wo')->all());
    }

    public function test_los_tecnicos_de_aliados_no_aparecen_en_empleados(): void
    {
        $this->actuarComo('admin');
        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona())->assertCreated();
        $this->usuario('general', ['cedula' => '8887776665', 'pendiente_alta' => false]);

        $respuesta = $this->getJson('/api/empleados')->assertOk()->json();
        $cedulas = collect($respuesta['data'] ?? $respuesta)->pluck('cedula');
        $this->assertContains('8887776665', $cedulas);
        $this->assertNotContains('1020304050', $cedulas);
    }

    public function test_un_aliado_con_tecnicos_no_se_elimina(): void
    {
        $this->actuarComo('admin');
        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona())->assertCreated();
        $vacio = Aliado::create($this->empresa());

        $this->deleteJson('/api/aliados/' . Aliado::where('tipo', 'tecnico')->value('id'))->assertStatus(422);
        $this->deleteJson("/api/aliados/{$vacio->id}")->assertOk();
    }

    public function test_el_rol_tecnico_no_administra_aliados(): void
    {
        $this->actuarComo('tecnico', ['cedula' => '123123123']);

        $this->postJson('/api/aliados', $this->empresa())->assertForbidden();
        $this->assertSame(0, Aliado::count());
    }

    public function test_editar_tecnico_e_inactivarlo(): void
    {
        $this->actuarComo('admin');
        $empresa = Aliado::create($this->empresa());
        $this->postJson("/api/aliados/{$empresa->id}/tecnicos", $this->persona())->assertCreated();
        $tecnico = User::where('cedula', '1020304050')->firstOrFail();

        $this->putJson("/api/aliados/{$empresa->id}/tecnicos/{$tecnico->id}", [
            'nombres' => 'Pedro José', 'apellidos' => 'Pérez', 'movil' => '3104445566', 'email' => 'pedro.perez@test.co', 'activo' => false,
        ])->assertOk();

        $this->assertSame(['PEDRO JOSÉ PÉREZ', false], [$tecnico->fresh()->name, $tecnico->fresh()->activo]);
    }
}
