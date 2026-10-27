<?php

namespace Tests\Feature\Inventario;

use App\Models\Aliado;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class AliadosTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private function empresa(array $extra = []): array
    {
        return array_merge([
            'tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900123456-7',
            'nombre' => 'TECNOMARIN S.A.S', 'telefono' => '3001112233', 'ciudad' => 'MEDELLIN',
        ], $extra);
    }

    private function persona(array $extra = []): array
    {
        return array_merge([
            'cedula' => '1020304050', 'nombres' => 'Pedro', 'apellidos' => 'Pérez',
            'movil' => '3104445566', 'email' => 'pedro.perez@test.co',
        ], $extra);
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
