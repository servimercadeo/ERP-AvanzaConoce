<?php

namespace Tests\Feature\Contratos;

use App\Models\RespuestaIngreso;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Administrativo > Empleados.
 */
class EmpleadosTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->actuarComo('th');
    }

    private function payload(array $extra = []): array
    {
        return array_merge([
            'cedula' => '4001', 'apellidos' => 'ramirez soto', 'nombres' => 'carlos andres', 'sede' => 'SEDE X', 'genero' => 'Masculino',
            'movil' => '3001112233', 'email' => 'carlos@test.co', 'eps' => 'sura', 'arl' => 'positiva',
            'estado_empleado' => 'Activo', 'cargo' => 'analista', 'rol' => 'operaciones', 'tipo_vinculacion' => 'Indefinido',
        ], $extra);
    }

    public function test_crear_empleado_normaliza_a_mayusculas_y_genera_credenciales_temporales(): void
    {
        $r = $this->postJson('/api/empleados', $this->payload())->assertCreated();

        $r->assertJsonPath('empleado.name', 'CARLOS ANDRES RAMIREZ SOTO')->assertJsonPath('empleado.rol', 'operaciones')
            ->assertJsonPath('credenciales.email', 'carlos@test.co');

        $clave = $r->json('credenciales.password');
        $this->assertSame(10, strlen($clave), 'La clave temporal debe tener 10 caracteres.');
        $this->assertTrue(Hash::check($clave, User::where('cedula', '4001')->value('password')), 'La clave entregada debe ser la que quedó guardada.');
        $this->assertNotSame($clave, User::where('cedula', '4001')->value('password'), 'Nunca se guarda en plano.');
    }

    public function test_el_tipo_de_funcionario_es_el_rol_y_solo_un_admin_asigna_administrador(): void
    {
        // TH (el usuario de setUp) no puede crear administradores ni roles inventados.
        $this->postJson('/api/empleados', $this->payload(['rol' => 'admin']))->assertStatus(422)->assertJsonValidationErrors('rol');
        $this->postJson('/api/empleados', $this->payload(['rol' => 'consultor']))->assertStatus(422)->assertJsonValidationErrors('rol');
        $this->assertNull(User::where('cedula', '4001')->first());

        $id = $this->postJson('/api/empleados', $this->payload(['rol' => 'financiera']))->assertCreated()->json('empleado.id');
        $this->assertSame('financiera', User::find($id)->rol);
        $this->putJson("/api/empleados/$id", $this->payload(['rol' => 'supervisores']))->assertOk();
        $this->assertSame('supervisores', User::find($id)->rol);

        // Un admin sí puede.
        $this->actuarComo('admin');
        $this->putJson("/api/empleados/$id", $this->payload(['rol' => 'admin']))->assertOk();
        $this->assertSame('admin', User::find($id)->rol);

        // Y TH no puede quitárselo (aunque lo intente, se conserva).
        $this->actuarComo('th');
        $this->putJson("/api/empleados/$id", $this->payload(['rol' => 'general']))->assertOk();
        $this->assertSame('admin', User::find($id)->rol);
    }

    public function test_campos_obligatorios(): void
    {
        $this->postJson('/api/empleados', [])->assertStatus(422)->assertJsonValidationErrors([
            'cedula', 'apellidos', 'nombres', 'genero', 'movil', 'email', 'estado_empleado', 'rol',
        ])->assertJsonMissingValidationErrors(['sede', 'eps', 'arl', 'cargo', 'tipo_vinculacion'], 'errors');
        $this->postJson('/api/empleados', $this->payload(['email' => 'no-es-correo']))->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_registrar_dos_veces_la_misma_cedula_actualiza_en_vez_de_duplicar(): void
    {
        $this->postJson('/api/empleados', $this->payload())->assertCreated();
        $r = $this->postJson('/api/empleados', $this->payload(['movil' => '3009998877']))->assertCreated();

        $this->assertSame(1, User::where('cedula', '4001')->count());
        $this->assertSame('3009998877', User::where('cedula', '4001')->value('movil'));
        $r->assertJsonPath('credenciales.password', '(Ya registrado)');
    }

    public function test_los_datos_de_contratacion_salen_del_contrato_y_no_se_editan_desde_empleados(): void
    {
        $empleado = $this->usuario('general', ['cedula' => '4001', 'email' => 'carlos@test.co']);
        $empleado->forceFill(['pendiente_alta' => true, 'activo' => false])->saveQuietly();
        \App\Models\Contrato::create([
            'empleado_id' => $empleado->id, 'cargo' => 'ASESOR COMERCIAL', 'sede' => 'SEDE CONTRATO', 'salario' => 1800000,
            'tipo_vinculacion' => 'Directa', 'lps_afiliado' => 'NUEVA EPS', 'arl' => 'SURA', 'fondo_pensiones' => 'PORVENIR',
            'caja_compensacion' => 'COMFAMA', 'empleador' => 'SERVIMERCADEO', 'fecha_ingreso' => '2026-01-01',
            'banco' => 'BANCOLOMBIA', 'tipo_cuenta' => 'Ahorros', 'cuenta_bancaria' => '12345678901',
            'estado_contrato' => 'Activo', 'completado' => true,
        ]);

        // El alta manda otros valores (como haría un formulario viejo): se ignoran y mandan los del contrato.
        $this->postJson('/api/empleados', $this->payload(['ingresos' => 99, 'cargo' => 'otro', 'sede' => 'OTRA']))->assertCreated();
        $this->putJson("/api/empleados/{$empleado->id}", $this->payload(['ingresos' => 99, 'eps' => 'OTRA EPS', 'banco' => 'NEQUI', 'cuenta_bancaria' => '000']))->assertOk();

        $e = $empleado->fresh();
        $this->assertSame('ASESOR COMERCIAL', $e->cargo);
        $this->assertSame('SEDE CONTRATO', $e->sede);
        $this->assertEquals(1800000, $e->ingresos);
        $this->assertSame('Directa', $e->tipo_vinculacion);
        $this->assertSame('NUEVA EPS', $e->eps);
        $this->assertSame('SURA', $e->arl);
        $this->assertSame('PORVENIR', $e->fondo_pensiones);
        $this->assertSame('COMFAMA', $e->caja_compensacion);
        $this->assertSame('SERVIMERCADEO', $e->empleador);
        $this->assertSame('BANCOLOMBIA', $e->banco);
        $this->assertSame('Ahorros', $e->tipo_cuenta);
        $this->assertSame('12345678901', $e->cuenta_bancaria);
    }

    public function test_dar_de_alta_un_empleado_importado_le_genera_credenciales_nuevas(): void
    {
        $pendiente = $this->usuario('general', ['cedula' => '4001', 'email' => 'carlos@test.co']);
        $pendiente->forceFill(['pendiente_alta' => true, 'activo' => false])->saveQuietly();

        $r = $this->postJson('/api/empleados', $this->payload())->assertCreated();

        $this->assertNotSame('(Ya registrado)', $r->json('credenciales.password'));
        $this->assertTrue((bool) $pendiente->fresh()->activo);
        $this->assertFalse((bool) $pendiente->fresh()->pendiente_alta);
    }

    /**
     * PÉRDIDA DE DATOS. EmpleadoController::update trata un correo que ya pertenece a OTRO
     * usuario como "duplicado a fusionar": borra al empleado que se está editando, reasigna
     * sus contratos al otro usuario y sobrescribe los datos de ese otro usuario con lo que
     * se envió. Un simple error de tipeo del correo elimina a una persona real y modifica a
     * otra. Lo esperado: rechazar (422) o, como mínimo, no borrar al empleado editado.
     */
    public function test_editar_con_el_correo_de_otro_empleado_no_borra_ni_sobrescribe_a_nadie(): void
    {
        $otro = $this->usuario('general', ['email' => 'ocupado@test.co', 'cedula' => '9999', 'name' => 'OTRO EMPLEADO']);
        $editando = $this->postJson('/api/empleados', $this->payload())->json('empleado.id');

        $this->putJson("/api/empleados/$editando", $this->payload(['email' => 'ocupado@test.co']))
            ->assertStatus(422)->assertJsonValidationErrors('email');

        $this->assertDatabaseHas('users', ['id' => $editando]);
        $this->assertSame('9999', $otro->fresh()->cedula, 'La cédula del otro empleado no debe cambiar.');
        $this->assertSame('OTRO EMPLEADO', $otro->fresh()->name);
    }

    public function test_listar_ver_editar_y_eliminar(): void
    {
        $id = $this->postJson('/api/empleados', $this->payload())->json('empleado.id');

        $this->getJson('/api/empleados')->assertOk()->assertJsonFragment(['id' => $id]);
        $this->getJson("/api/empleados/$id")->assertOk()->assertJsonPath('cedula', '4001');
        $this->putJson("/api/empleados/$id", $this->payload(['sede' => 'OTRA SEDE']))->assertOk();
        $this->deleteJson("/api/empleados/$id")->assertOk()->assertJsonPath('message', 'Empleado eliminado por completo.');
        $this->assertDatabaseMissing('users', ['id' => $id]);
    }

    public function test_eliminar_un_empleado_lo_borra_por_completo_y_devuelve_el_inventario(): void
    {
        $emp = $this->usuario('general', ['cedula' => '4500']);
        $contrato = \App\Models\Contrato::create(['empleado_id' => $emp->id, 'cargo' => 'ASESOR', 'estado_contrato' => 'Activo']);

        // Dotación en proceso (ya descontada del inventario).
        $camisa = \App\Models\InventarioDotacion::create([
            'proyecto' => 'SYM TIGO HOME', 'prenda' => 'CAMISA', 'genero' => 'Masculino', 'talla' => 'M',
            'precio' => 1000, 'cantidad' => 10, 'stock_minimo' => 0,
        ]);
        $pedido = \App\Models\PedidoAutomatico::create(['codigo' => '90001', 'contrato_id' => $contrato->id, 'empleado_id' => $emp->id, 'estado' => 'Activo']);
        $pedido->asignarItems([['inventario_dotacion_id' => $camisa->id, 'cantidad' => 3]]);
        $this->assertSame(7, $camisa->fresh()->cantidad);

        // Equipo asignado sin devolver.
        $equipo = $this->inventario($this->tipoProducto(), $this->sede(), 4);
        $equipo->decrement('cantidad');
        \App\Models\AsignacionInventario::create([
            'inventario_producto_id' => $equipo->id, 'user_id' => $emp->id, 'cantidad' => 1, 'fecha_asignacion' => now()->toDateString(),
        ]);

        // Su proceso de selección.
        $req = \App\Models\Requisicion::create([
            'nro_identificacion_proceso' => $this->unico('PROC'), 'nro_identificacion' => $this->unico('REQ'),
            'fecha_solicitud' => '2026-10-01', 'requeridas' => 1, 'estado' => 'Completada',
        ]);
        $cand = \App\Models\Candidato::create([
            'nombres' => 'X', 'identificacion' => '4500', 'correo' => 'x4500@test.co', 'fecha_postulacion' => '2026-10-01',
            'requisicion_id' => $req->id, 'pruebas' => true, 'aval' => true,
        ]);
        \App\Models\BaseIngreso::create(['candidato_id' => $cand->id, 'documento_identificacion' => '4500', 'nombre_completo' => 'X']);
        RespuestaIngreso::create([
            'documento' => '4500', 'nombres' => 'X', 'apellidos' => 'Y', 'fecha_nacimiento' => '1990-01-01', 'lugar_nacimiento' => 'P',
            'estado_civil' => 'S', 'numero_hijos' => '0', 'rh' => 'O+', 'nivel_escolaridad' => 'B', 'profesion' => 'N', 'ciudad' => 'P',
            'barrio' => 'C', 'direccion' => 'D', 'estrato' => '3', 'correo' => 'x4500@test.co', 'celular' => '3004500000', 'emergencia_nombre' => 'E',
            'emergencia_telefono' => '300', 'emergencia_parentesco' => 'P', 'eps' => 'E', 'afp' => 'A',
            'talla_camisa' => 'S', 'talla_pantalon' => '28', 'talla_zapatos' => '38',
        ]);

        $this->deleteJson("/api/empleados/{$emp->id}")->assertOk()
            ->assertJsonPath('eliminado.contratos', 1)->assertJsonPath('eliminado.pedidos_dotacion', 1)
            ->assertJsonPath('eliminado.candidatos', 1);

        $this->assertDatabaseMissing('users', ['id' => $emp->id]);
        $this->assertDatabaseMissing('contratos', ['id' => $contrato->id]);
        $this->assertDatabaseMissing('pedidos_automaticos', ['id' => $pedido->id]);
        $this->assertDatabaseMissing('asignaciones_inventario', ['user_id' => $emp->id]);
        $this->assertDatabaseMissing('candidatos', ['identificacion' => '4500']);
        $this->assertDatabaseMissing('base_ingresos', ['documento_identificacion' => '4500']);
        $this->assertDatabaseMissing('respuestas_ingresos', ['documento' => '4500']);
        // Lo que tenía vuelve al inventario y la vacante se libera.
        $this->assertSame(10, $camisa->fresh()->cantidad);
        $this->assertSame(4, $equipo->fresh()->cantidad);
        $this->assertNotSame('Completada', $req->fresh()->estado);
    }

    public function test_nadie_puede_eliminarse_a_si_mismo(): void
    {
        $yo = $this->actuarComo('admin', ['cedula' => '4600']);

        $this->deleteJson("/api/empleados/{$yo->id}")->assertStatus(422);
        $this->assertDatabaseHas('users', ['id' => $yo->id]);
    }

    public function test_actualizar_tallas_tambien_actualiza_las_respuestas_del_formulario(): void
    {
        $emp = $this->usuario('general', ['cedula' => '4002']);
        RespuestaIngreso::create([
            'documento' => '4002', 'nombres' => 'X', 'apellidos' => 'Y', 'fecha_nacimiento' => '1990-01-01', 'lugar_nacimiento' => 'P',
            'estado_civil' => 'S', 'numero_hijos' => '0', 'rh' => 'O+', 'nivel_escolaridad' => 'B', 'profesion' => 'N', 'ciudad' => 'P',
            'barrio' => 'C', 'direccion' => 'D', 'estrato' => '3', 'correo' => 'x@test.co', 'celular' => '300', 'emergencia_nombre' => 'E',
            'emergencia_telefono' => '300', 'emergencia_parentesco' => 'P', 'eps' => 'E', 'afp' => 'A',
            'talla_camisa' => 'S', 'talla_pantalon' => '28', 'talla_zapatos' => '38',
        ]);

        $this->patchJson("/api/empleados/{$emp->id}/tallas", ['talla_camisa' => 'XL', 'talla_pantalon' => '36', 'talla_zapatos' => '43'])
            ->assertOk()->assertJson(['talla_camisa' => 'XL', 'talla_pantalon' => '36', 'talla_zapatos' => '43']);

        $this->assertSame('XL', $emp->fresh()->talla_camisa);
        $this->assertSame('XL', RespuestaIngreso::where('documento', '4002')->value('talla_camisa'));
    }

    public function test_fotografia_debe_ser_una_imagen_de_maximo_5mb(): void
    {
        $emp = $this->usuario('general');

        $this->postJson("/api/empleados/{$emp->id}/fotografia", ['fotografia' => UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')])
            ->assertStatus(422)->assertJsonValidationErrors('fotografia');
        $this->postJson("/api/empleados/{$emp->id}/fotografia", ['fotografia' => UploadedFile::fake()->image('grande.jpg')->size(6000)])
            ->assertStatus(422);

        $r = $this->postJson("/api/empleados/{$emp->id}/fotografia", ['fotografia' => UploadedFile::fake()->image('foto.jpg')])->assertOk();
        Storage::disk('public')->assertExists($r->json('fotografia'));
    }

    public function test_busqueda_de_empleados_con_contrato_para_pedidos(): void
    {
        $emp = $this->usuario('general', ['nombres' => 'ZULEIMA', 'apellidos' => 'UNICA', 'name' => 'ZULEIMA UNICA', 'cedula' => '4003']);
        DB::table('contratos')->insert([
            'empleado_id' => $emp->id, 'completado' => true, 'estado_contrato' => 'Activo', 'created_at' => now(), 'updated_at' => now(),
        ]);

        $ids = collect($this->getJson('/api/empleados/candidatos-listos?search=ZULEIMA')->assertOk()->json())->pluck('user_id');

        $this->assertSame([$emp->id], $ids->all());
    }
}
