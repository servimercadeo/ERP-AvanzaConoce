<?php

namespace Tests\Feature\Contratos;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Alta de un empleado => su usuario también se crea en AvanzaConoce con la misma contraseña
 * (App\Services\AltaEnAvanzaConoce). AvanzaConoce se simula con Http::fake.
 */
class AltaEnAvanzaConoceTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private const URL = 'https://avanza.test/api/erp/empleados';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        config([
            'sso.crear_usuarios_en_avanza' => true,
            'sso.avanzaconoce_api_url'     => 'https://avanza.test/',
            'sso.secret'                   => 'secreto-compartido',
        ]);
        $this->actuarComo('th');
    }

    private function payload(array $extra = []): array
    {
        return array_merge([
            'cedula' => '4001', 'apellidos' => 'ramirez soto', 'nombres' => 'carlos andres', 'sede' => 'SEDE X', 'genero' => 'Masculino',
            'movil' => '3001112233', 'email' => 'Carlos@Test.co', 'eps' => 'sura', 'arl' => 'positiva',
            'estado_empleado' => 'Activo', 'cargo' => 'analista', 'rol' => 'th', 'tipo_vinculacion' => 'Indefinido',
        ], $extra);
    }

    public function test_al_dar_de_alta_lo_crea_en_avanza_con_el_mismo_hash_y_sin_la_clave_en_claro(): void
    {
        Http::fake([self::URL => Http::response(['id' => 777, 'ya_existia' => false], 201)]);

        $r = $this->postJson('/api/empleados', $this->payload())->assertCreated();

        $clave = $r->json('credenciales.password');
        $user = User::where('cedula', '4001')->first();
        $this->assertTrue(Hash::check($clave, $user->password));
        $r->assertJsonPath('credenciales.avanza.estado', 'ok');
        $this->assertSame('ok', $user->avanza_sync_estado);
        $this->assertSame(777, (int) $user->avanzaconoce_id);

        Http::assertSent(function (Request $req) use ($user, $clave) {
            return $req->url() === self::URL
                && $req->hasHeader('X-ERP-Secret', 'secreto-compartido')
                && $req['cedula'] === '4001'
                && $req['email'] === $user->email
                && $req['password_hash'] === $user->password
                && $req['rol_avanza'] === 'admin'
                && !str_contains($req->body(), $clave);
        });
    }

    public function test_sin_regla_de_rol_no_se_crea_en_avanza_y_queda_esperando_la_regla(): void
    {
        Http::fake([self::URL => Http::response(['id' => 790], 201)]);

        $r = $this->postJson('/api/empleados', $this->payload(['rol' => 'operaciones']))->assertCreated();

        $r->assertJsonPath('credenciales.avanza.estado', 'sin_rol');
        $this->assertStringContainsString('operaciones', $r->json('credenciales.avanza.mensaje'));
        $this->assertSame('sin_rol', User::where('cedula', '4001')->value('avanza_sync_estado'));
        Http::assertNothingSent();
    }

    public function test_un_cargo_de_supervisor_queda_con_rol_supervisores_en_el_erp(): void
    {
        config(['sso.crear_usuarios_en_avanza' => false]);
        foreach (['6001' => 'SUPERVISOR COMERCIAL', '6002' => 'ASESOR COMERCIAL'] as $cedula => $cargo) {
            $this->postJson('/api/contratos', [
                'documento' => $cedula, 'nombres' => 'ana', 'apellidos' => 'perez', 'cargo' => $cargo,
                'tipo_contrato' => 'Indefinido', 'fecha_ingreso' => '2026-09-01', 'estado_contrato' => 'Activo',
            ])->assertCreated();
        }

        $this->assertSame('supervisores', User::where('cedula', '6001')->value('rol'));
        $this->assertSame('general', User::where('cedula', '6002')->value('rol'));
    }

    public function test_apagado_no_llama_a_avanza_y_el_alta_sigue_igual(): void
    {
        config(['sso.crear_usuarios_en_avanza' => false]);
        Http::fake();

        $this->postJson('/api/empleados', $this->payload())->assertCreated()->assertJsonPath('credenciales.avanza', null);

        Http::assertNothingSent();
        $this->assertNull(User::where('cedula', '4001')->value('avanza_sync_estado'));
    }

    public function test_si_avanza_esta_caido_el_alta_no_falla_y_el_comando_lo_reintenta(): void
    {
        Http::fake([self::URL => Http::sequence()->pushFailedConnection()->push(['id' => 778], 201)]);

        $r = $this->postJson('/api/empleados', $this->payload())->assertCreated();
        $r->assertJsonPath('credenciales.avanza.estado', 'error');
        $this->assertSame('error', User::where('cedula', '4001')->value('avanza_sync_estado'));

        $this->artisan('avanza:sincronizar-usuarios')->assertSuccessful();

        $user = User::where('cedula', '4001')->first();
        $this->assertSame('ok', $user->avanza_sync_estado);
        $this->assertNull($user->avanza_sync_error);
        $this->assertSame(778, (int) $user->avanzaconoce_id);
    }

    public function test_un_conflicto_no_se_reintenta_hasta_que_se_corrige_el_dato(): void
    {
        Http::fake([self::URL => Http::sequence()
            ->push(['message' => 'El correo ya pertenece a otra persona en AvanzaConoce.'], 409)
            ->push(['id' => 779], 201)]);

        $r = $this->postJson('/api/empleados', $this->payload())->assertCreated();
        $r->assertJsonPath('credenciales.avanza.estado', 'conflicto');
        $this->assertStringContainsString('otra persona', $r->json('credenciales.avanza.mensaje'));
        $id = $r->json('empleado.id');

        $this->artisan('avanza:sincronizar-usuarios')->assertSuccessful();
        $this->assertSame('conflicto', User::find($id)->avanza_sync_estado, 'Sin corregir el dato no se reintenta.');
        Http::assertSentCount(1);

        $this->putJson("/api/empleados/$id", $this->payload(['email' => 'carlos.nuevo@test.co']))->assertOk();
        $this->assertSame('pendiente', User::find($id)->avanza_sync_estado);

        $this->artisan('avanza:sincronizar-usuarios')->assertSuccessful();
        $this->assertSame('ok', User::find($id)->avanza_sync_estado);
    }

    public function test_el_import_no_da_de_alta_sin_celular_porque_es_obligatorio(): void
    {
        Http::fake([self::URL => Http::response(['id' => 783], 201)]);
        $this->postJson('/api/contratos', [
            'documento' => '5002', 'nombres' => 'luis', 'apellidos' => 'gomez', 'cargo' => 'ASESOR',
            'tipo_contrato' => 'Indefinido', 'fecha_ingreso' => '2026-09-01', 'estado_contrato' => 'Activo',
        ])->assertCreated();
        $user = User::where('cedula', '5002')->first();
        $user->forceFill(['pendiente_alta' => true, 'movil' => null, 'rol' => 'th'])->saveQuietly();

        $r = $this->postJson('/api/empleados/importar-datos-personales', ['filas' => [['cedula' => '5002', 'barrio' => 'CENTRO']]])->assertOk();

        $r->assertJsonPath('sin_celular', ['5002'])->assertJsonPath('dados_de_alta', 0);
        $this->assertTrue((bool) $user->fresh()->pendiente_alta, 'Sin celular sigue pendiente.');
        $this->assertSame('CENTRO', $user->fresh()->barrio, 'Los demás datos sí se guardan.');
        $this->assertNull(collect($r->json('detalle'))->firstWhere('cedula', '5002')['credenciales']);
        Http::assertNothingSent();

        // Con el celular en el Excel se da de alta y se crea en AvanzaConoce.
        $r = $this->postJson('/api/empleados/importar-datos-personales', ['filas' => [['cedula' => '5002', 'movil' => '3005556677']]])->assertOk();
        $r->assertJsonPath('dados_de_alta', 1)->assertJsonPath('sin_celular', []);
        $this->assertSame('ok', $user->fresh()->avanza_sync_estado);
        Http::assertSent(fn (Request $req) => $req['movil'] === '3005556677' && $req['fecha_ingreso'] === '2026-09-01');
    }

    public function test_un_usuario_ya_activo_sin_celular_no_se_envia_hasta_completarlo(): void
    {
        // Empleados antiguos sin celular se quedan como están; al reintentar se marcan para corregir.
        Http::fake([self::URL => Http::response(['id' => 784], 201)]);
        $viejo = $this->usuario('th', ['cedula' => '5003', 'email' => 'viejo@test.co', 'movil' => null]);
        $viejo->forceFill(['avanza_sync_estado' => 'pendiente'])->saveQuietly();

        $this->artisan('avanza:sincronizar-usuarios')->assertSuccessful();

        $this->assertSame('conflicto', $viejo->fresh()->avanza_sync_estado);
        $this->assertStringContainsString('celular', $viejo->fresh()->avanza_sync_error);
        Http::assertNothingSent();
    }

    public function test_completar_el_alta_de_un_pendiente_tambien_lo_crea_en_avanza(): void
    {
        Http::fake([self::URL => Http::response(['id' => 780], 201)]);
        $pendiente = $this->usuario('th', ['cedula' => '4001', 'email' => 'carlos@test.co']);
        $pendiente->forceFill(['pendiente_alta' => true, 'activo' => false])->saveQuietly();

        $this->postJson('/api/empleados', $this->payload())->assertCreated()->assertJsonPath('credenciales.avanza.estado', 'ok');

        Http::assertSentCount(1);
        $this->assertSame('ok', $pendiente->fresh()->avanza_sync_estado);
    }

    public function test_editar_un_empleado_ya_dado_de_alta_no_vuelve_a_crearlo(): void
    {
        Http::fake([self::URL => Http::response(['id' => 781], 201)]);
        $id = $this->postJson('/api/empleados', $this->payload())->json('empleado.id');

        $this->putJson("/api/empleados/$id", $this->payload(['movil' => '3009998877']))->assertOk();

        Http::assertSentCount(1);
    }

    public function test_el_import_de_datos_personales_crea_en_avanza_a_los_que_da_de_alta(): void
    {
        Http::fake([self::URL => Http::response(['id' => 782], 201)]);
        $this->postJson('/api/contratos', [
            'documento' => '5001', 'nombres' => 'ana', 'apellidos' => 'perez', 'cargo' => 'ASESOR',
            'tipo_contrato' => 'Indefinido', 'fecha_ingreso' => '2026-09-01', 'estado_contrato' => 'Activo',
        ])->assertCreated();
        User::where('cedula', '5001')->first()->forceFill(['pendiente_alta' => true, 'movil' => '3001234567', 'rol' => 'th'])->saveQuietly();

        $r = $this->postJson('/api/empleados/importar-datos-personales', ['filas' => [['cedula' => '5001', 'barrio' => 'CENTRO']]])->assertOk();

        $fila = collect($r->json('detalle'))->firstWhere('cedula', '5001');
        $this->assertSame('ok', $fila['credenciales']['avanza']['estado']);
        $this->assertTrue(Hash::check($fila['credenciales']['password'], User::where('cedula', '5001')->value('password')));
        Http::assertSent(fn (Request $req) => $req->url() === self::URL && $req['cedula'] === '5001');
    }
}
