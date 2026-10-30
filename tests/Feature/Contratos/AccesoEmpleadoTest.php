<?php

namespace Tests\Feature\Contratos;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Estado Empleado controla el acceso al ERP y a AvanzaConoce; al finalizar un contrato
 * (Finalizado / Finalizado traslado) sin otro vigente, la persona queda Inactiva
 * (App\Services\AccesoEmpleado). AvanzaConoce se simula con Http::fake.
 */
class AccesoEmpleadoTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private const URL_ESTADO = 'https://avanza.test/api/erp/empleados/estado';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        config([
            'sso.crear_usuarios_en_avanza' => true,
            'sso.avanzaconoce_api_url'     => 'https://avanza.test/',
            'sso.secret'                   => 'secreto-compartido',
        ]);
        Http::fake(['*' => Http::response(['actualizado' => true], 200)]);
        $this->actuarComo('th');
    }

    private function empleado(array $atributos = []): User
    {
        return $this->usuario('general', array_merge([
            'cedula' => '7100', 'estado_empleado' => 'Activo', 'pendiente_alta' => false,
            'nombres' => 'ANA', 'apellidos' => 'GIL', 'genero' => 'Femenino',
        ], $atributos));
    }

    private function payload(User $empleado, array $extra = []): array
    {
        return array_merge([
            'empleado_id' => $empleado->id, 'tipo_contrato' => 'Indefinido', 'cargo' => 'ANALISTA', 'sede' => 'SEDE X',
            'fecha_ingreso' => '2026-01-01', 'estado_contrato' => 'Vigente', 'empresa' => 'ALTYCOM', 'cliente_proyecto' => 'HUGHES COL',
        ], $extra);
    }

    private function contrato(User $empleado, array $extra = []): int
    {
        return $this->postJson('/api/contratos', $this->payload($empleado, $extra))->assertCreated()->json('id');
    }

    private function enviadoAAvanza(string $cedula, string $estado): bool
    {
        return Http::recorded(fn (Request $r) => $r->url() === self::URL_ESTADO && $r['cedula'] === $cedula && $r['estado'] === $estado
            && $r->hasHeader('X-ERP-Secret', 'secreto-compartido'))->isNotEmpty();
    }

    public function test_finalizar_el_contrato_inactiva_en_el_erp_y_en_avanzaconoce(): void
    {
        $empleado = $this->empleado();
        $id = $this->contrato($empleado);
        $this->assertTrue((bool) $empleado->fresh()->activo);

        $this->putJson("/api/contratos/$id", $this->payload($empleado, ['estado_contrato' => 'Finalizado', 'motivo_finalizacion' => 'Voluntario']))->assertOk();

        $empleado->refresh();
        $this->assertFalse((bool) $empleado->activo);
        $this->assertSame('Inactivo', $empleado->estado_empleado);
        $this->assertTrue($this->enviadoAAvanza('7100', 'Inactivo'));
    }

    public function test_finalizado_traslado_tambien_inactiva(): void
    {
        $empleado = $this->empleado(['cedula' => '7101']);
        $id = $this->contrato($empleado);

        $this->putJson("/api/contratos/$id", $this->payload($empleado, ['estado_contrato' => 'Finalizado traslado']))->assertOk();

        $this->assertFalse((bool) $empleado->fresh()->activo);
        $this->assertTrue($this->enviadoAAvanza('7101', 'Inactivo'));
    }

    public function test_con_otro_contrato_vigente_no_se_inactiva(): void
    {
        $empleado = $this->empleado(['cedula' => '7102']);
        $viejo = $this->contrato($empleado, ['fecha_ingreso' => '2024-01-01']);
        $this->contrato($empleado, ['fecha_ingreso' => '2026-01-01', 'estado_contrato' => 'Traslado']);

        $this->putJson("/api/contratos/$viejo", $this->payload($empleado, ['fecha_ingreso' => '2024-01-01', 'estado_contrato' => 'Finalizado', 'motivo_finalizacion' => 'Terminación']))->assertOk();

        $this->assertTrue((bool) $empleado->fresh()->activo);
        $this->assertSame('Activo', $empleado->fresh()->estado_empleado);
        $this->assertFalse($this->enviadoAAvanza('7102', 'Inactivo'));
    }

    public function test_el_admin_no_se_bloquea_por_un_contrato(): void
    {
        $admin = $this->usuario('admin', ['cedula' => '7103']);
        $id = $this->contrato($admin);

        $this->putJson("/api/contratos/$id", $this->payload($admin, ['estado_contrato' => 'Finalizado', 'motivo_finalizacion' => 'Voluntario']))->assertOk();

        $this->assertTrue((bool) $admin->fresh()->activo);
    }

    public function test_editar_a_un_admin_con_estado_inactivo_no_lo_bloquea(): void
    {
        $admin = $this->usuario('admin', ['cedula' => '7107', 'nombres' => 'ANA', 'apellidos' => 'GIL', 'genero' => 'Femenino', 'estado_empleado' => 'Inactivo']);
        $this->contrato($admin);
        $datos = $admin->fresh()->only(['cedula', 'nombres', 'apellidos', 'email', 'genero']) + ['movil' => '3001234502', 'rol' => 'admin', 'estado_empleado' => 'Inactivo'];

        $this->actuarComo('admin');
        $this->putJson("/api/empleados/{$admin->id}", $datos)->assertOk();

        $this->assertTrue((bool) $admin->fresh()->activo);
        $this->assertFalse($this->enviadoAAvanza('7107', 'Inactivo'));
    }

    public function test_volver_a_vigente_no_reactiva_solo_y_estado_empleado_si(): void
    {
        $empleado = $this->empleado(['cedula' => '7104']);
        $id = $this->contrato($empleado);
        $this->putJson("/api/contratos/$id", $this->payload($empleado, ['estado_contrato' => 'Finalizado', 'motivo_finalizacion' => 'Voluntario']))->assertOk();
        $this->putJson("/api/contratos/$id", $this->payload($empleado, ['estado_contrato' => 'Vigente']))->assertOk();
        $this->assertFalse((bool) $empleado->fresh()->activo, 'Reactivar es explícito, desde Empleados.');

        // Empleados > Estado Empleado = Activo: vuelve a entrar al ERP y a AvanzaConoce.
        $datos = $empleado->fresh()->only(['cedula', 'nombres', 'apellidos', 'email', 'genero']) + ['movil' => '3001234500', 'rol' => 'general', 'estado_empleado' => 'Activo'];
        $this->putJson("/api/empleados/{$empleado->id}", $datos)->assertOk();
        $this->assertTrue((bool) $empleado->fresh()->activo);
        $this->assertTrue($this->enviadoAAvanza('7104', 'Activo'));
    }

    public function test_estado_empleado_inactivo_o_retirado_quita_el_acceso_y_vacaciones_no(): void
    {
        $empleado = $this->empleado(['cedula' => '7105']);
        $this->contrato($empleado);
        $datos = fn (string $estado) => $empleado->fresh()->only(['cedula', 'nombres', 'apellidos', 'email', 'genero']) + ['movil' => '3001234501', 'rol' => 'general', 'estado_empleado' => $estado];

        $this->putJson("/api/empleados/{$empleado->id}", $datos('Vacaciones'))->assertOk();
        $this->assertTrue((bool) $empleado->fresh()->activo);

        $this->putJson("/api/empleados/{$empleado->id}", $datos('Retirado'))->assertOk();
        $this->assertFalse((bool) $empleado->fresh()->activo);
        $this->assertSame('Retirado', $empleado->fresh()->estado_empleado);
        $this->assertTrue($this->enviadoAAvanza('7105', 'Inactivo'));
    }

    public function test_un_usuario_inactivo_no_entra_al_erp_y_su_sesion_se_cierra(): void
    {
        $this->usuario('general', ['email' => 'inactivo@test.co', 'activo' => false, 'estado_empleado' => 'Inactivo']);
        $this->app['auth']->forgetGuards();
        $this->postJson('/login', ['email' => 'inactivo@test.co', 'password' => 'password'])
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Tu usuario está inactivo. Si crees que es un error, comunícate con Talento Humano.');

        // Quedó inactivo con la sesión abierta: su siguiente petición sale con 401.
        $sesion = $this->actuarComo('general', ['email' => 'sesion@test.co']);
        $this->getJson('/api/user')->assertOk();
        $sesion->forceFill(['activo' => false])->saveQuietly();
        $this->getJson('/api/user')->assertUnauthorized()->assertJsonPath('message', 'Tu usuario está inactivo.');
    }

    public function test_contrato_importado_ya_finalizado_deja_a_la_persona_nueva_inactiva_al_darle_el_alta(): void
    {
        // Importar Excel de Contratos: cédula nueva con su contrato ya finalizado.
        $this->postJson('/api/contratos', [
            'documento' => '7106', 'nombres' => 'LUIS', 'apellidos' => 'MORA', 'tipo_contrato' => 'Indefinido', 'cargo' => 'ANALISTA',
            'sede' => 'SEDE X', 'fecha_ingreso' => '2020-01-01', 'estado_contrato' => 'Finalizado', 'empresa' => 'ALTYCOM', 'cliente_proyecto' => 'HUGHES COL',
        ])->assertCreated();
        $nuevo = User::where('cedula', '7106')->firstOrFail();
        $this->assertSame('Inactivo', $nuevo->estado_empleado);

        // Empleados > Importar Excel le da el alta: recibe credenciales pero no acceso.
        $this->postJson('/api/empleados/importar-datos-personales', ['filas' => [['cedula' => '7106', 'movil' => '3109990000']]])->assertOk();
        $nuevo->refresh();
        $this->assertFalse((bool) $nuevo->pendiente_alta);
        $this->assertFalse((bool) $nuevo->activo);
        $this->assertTrue($this->enviadoAAvanza('7106', 'Inactivo'));
    }
}
