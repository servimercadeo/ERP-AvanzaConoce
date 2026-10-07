<?php

namespace Tests\Feature\Acceso;

use App\Models\User;
use App\Services\SsoService;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class SsoTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private const SECRETO = 'secreto-de-prueba-de-32-caracteres-min';

    protected function setUp(): void
    {
        parent::setUp();
        config(['sso.secret' => self::SECRETO]);
    }

    public function test_generar_token_sso_exige_el_secreto(): void
    {
        $body = ['email' => 'a@test.co', 'avanzaconoce_id' => 1];

        $this->postJson('/api/sso/token', $body)->assertUnauthorized();
        $this->postJson('/api/sso/token', $body, ['X-ERP-Secret' => 'incorrecto'])->assertUnauthorized();
        $this->postJson('/api/sso/token', $body, ['X-ERP-Secret' => self::SECRETO])
            ->assertOk()->assertJsonStructure(['token', 'expires_in', 'redirect']);
    }

    public function test_login_sso_con_token_valido_inicia_sesion_y_registra_fecha(): void
    {
        $u = $this->usuario('th', ['email' => 'sso@test.co']);
        $token = app(SsoService::class)->generarToken('sso@test.co', 5);

        $this->get('/sso/login?token=' . $token)->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($u);
        $this->assertNotNull($u->fresh()->ultimo_sso_at);
    }

    public function test_login_sso_rechaza_token_ausente_invalido_o_de_usuario_inactivo(): void
    {
        $this->get('/sso/login')->assertRedirect('/login?sso_error=token_ausente');
        $this->get('/sso/login?token=basura')->assertRedirect('/login?sso_error=token_invalido');
        $this->assertGuest();

        $this->usuario('th', ['email' => 'inactivo@test.co', 'activo' => false]);
        $token = app(SsoService::class)->generarToken('inactivo@test.co', 9);
        $this->get('/sso/login?token=' . $token)->assertRedirect('/login?sso_error=sin_acceso');
        $this->assertGuest();
    }

    public function test_login_sso_de_usuario_no_creado_en_el_erp_indica_sin_acceso(): void
    {
        $token = app(SsoService::class)->generarToken('nuevo@test.co', 11);

        $this->get('/sso/login?token=' . $token)->assertRedirect('/login?sso_error=sin_acceso');
        $this->assertGuest();
    }

    public function test_token_firmado_con_otro_secreto_se_rechaza(): void
    {
        $this->usuario('th', ['email' => 'falso@test.co']);
        $malo = JWT::encode(['email' => 'falso@test.co', 'exp' => time() + 60], 'otro-secreto-completamente-distinto-1234', 'HS256');

        $this->get('/sso/login?token=' . $malo)->assertRedirect('/login?sso_error=token_invalido');
        $this->assertGuest();
    }

    public function test_token_expirado_se_rechaza(): void
    {
        $this->usuario('th', ['email' => 'viejo@test.co']);
        $expirado = JWT::encode(['email' => 'viejo@test.co', 'exp' => time() - 120], self::SECRETO, 'HS256');

        $this->get('/sso/login?token=' . $expirado)->assertRedirect('/login?sso_error=token_invalido');
        $this->assertGuest();
    }

    public function test_recibir_usuario_desde_avanzaconoce_exige_secreto_y_hace_upsert(): void
    {
        $payload = ['name' => 'Desde Avanza', 'email' => 'avanza@test.co', 'password' => 'clave-plana', 'avanzaconoce_id' => 42];

        $this->postJson('/api/users/desde-avanzaconoce', $payload)->assertUnauthorized();
        $this->assertDatabaseMissing('users', ['email' => 'avanza@test.co']);

        $h = ['X-ERP-Secret' => self::SECRETO];
        $this->postJson('/api/users/desde-avanzaconoce', $payload, $h)->assertCreated();
        $this->assertDatabaseHas('users', ['email' => 'avanza@test.co', 'avanzaconoce_id' => 42, 'activo' => 1]);

        // Segunda llamada con el mismo correo: actualiza, no duplica.
        $this->postJson('/api/users/desde-avanzaconoce', array_merge($payload, ['name' => 'Renombrado']), $h)->assertCreated();
        $this->assertSame(1, User::where('email', 'avanza@test.co')->count());
        $this->assertSame('Renombrado', User::where('email', 'avanza@test.co')->value('name'));

        // La contraseña queda hasheada, nunca en plano.
        $this->assertNotSame('clave-plana', User::where('email', 'avanza@test.co')->value('password'));
    }

    /**
     * Con SSO_SECRET vacío en producción, un atacante podría "acertar" mandando el header
     * vacío. Este test documenta el comportamiento actual con secreto vacío para que un
     * despliegue sin SSO_SECRET no pase desapercibido.
     */
    public function test_con_secreto_vacio_no_se_debe_aceptar_la_peticion(): void
    {
        config(['sso.secret' => '']);

        $this->postJson('/api/users/desde-avanzaconoce',
            ['name' => 'X', 'email' => 'x@test.co', 'password' => 'p', 'avanzaconoce_id' => 1],
            ['X-ERP-Secret' => '']
        )->assertUnauthorized();
    }
}
