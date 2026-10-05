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
            'estado_empleado' => 'Activo', 'cargo' => 'analista', 'tipo_funcionario' => 'Consultor', 'tipo_vinculacion' => 'Indefinido',
        ], $extra);
    }

    public function test_crear_empleado_normaliza_a_mayusculas_y_genera_credenciales_temporales(): void
    {
        $r = $this->postJson('/api/empleados', $this->payload())->assertCreated();

        $r->assertJsonPath('empleado.name', 'CARLOS ANDRES RAMIREZ SOTO')->assertJsonPath('empleado.cargo', 'ANALISTA')
            ->assertJsonPath('credenciales.email', 'carlos@test.co');

        $clave = $r->json('credenciales.password');
        $this->assertSame(10, strlen($clave), 'La clave temporal debe tener 10 caracteres.');
        $this->assertTrue(Hash::check($clave, User::where('cedula', '4001')->value('password')), 'La clave entregada debe ser la que quedó guardada.');
        $this->assertNotSame($clave, User::where('cedula', '4001')->value('password'), 'Nunca se guarda en plano.');
    }

    public function test_un_empleado_nuevo_siempre_entra_como_consultor_aunque_se_intente_forzar_otro_rol(): void
    {
        $this->postJson('/api/empleados', $this->payload(['rol' => 'admin']))->assertCreated();

        $this->assertNotSame('admin', User::where('cedula', '4001')->value('rol'));
    }

    public function test_campos_obligatorios(): void
    {
        $this->postJson('/api/empleados', [])->assertStatus(422)->assertJsonValidationErrors([
            'cedula', 'apellidos', 'nombres', 'sede', 'genero', 'movil', 'email', 'eps', 'arl', 'estado_empleado', 'cargo', 'tipo_funcionario', 'tipo_vinculacion',
        ]);
        $this->postJson('/api/empleados', $this->payload(['email' => 'no-es-correo']))->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_registrar_dos_veces_la_misma_cedula_actualiza_en_vez_de_duplicar(): void
    {
        $this->postJson('/api/empleados', $this->payload())->assertCreated();
        $r = $this->postJson('/api/empleados', $this->payload(['cargo' => 'coordinador']))->assertCreated();

        $this->assertSame(1, User::where('cedula', '4001')->count());
        $this->assertSame('COORDINADOR', User::where('cedula', '4001')->value('cargo'));
        $r->assertJsonPath('credenciales.password', '(Ya registrado)');
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
        $this->deleteJson("/api/empleados/$id")->assertNoContent();
        $this->assertDatabaseMissing('users', ['id' => $id]);
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
