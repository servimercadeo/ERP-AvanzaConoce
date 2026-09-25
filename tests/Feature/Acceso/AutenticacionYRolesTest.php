<?php

namespace Tests\Feature\Acceso;

use App\Models\PermisoDenegado;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class AutenticacionYRolesTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    public function test_health_check_es_publico(): void
    {
        $this->getJson('/api/health')->assertOk()->assertJson(['status' => 'ok']);
    }

    public function test_rutas_protegidas_exigen_autenticacion(): void
    {
        foreach (['/api/user', '/api/sedes', '/api/pedidos-compra', '/api/inventario-productos', '/api/proveedores', '/api/empleados'] as $ruta) {
            $this->getJson($ruta)->assertUnauthorized();
        }
    }

    public function test_login_correcto_devuelve_usuario_y_credenciales_malas_fallan(): void
    {
        $this->usuario('admin', ['email' => 'admin@test.co']);

        $this->postJson('/login', ['email' => 'admin@test.co', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('user.email', 'admin@test.co')
            ->assertJsonPath('user.rol', 'admin');

        $this->postJson('/login', ['email' => 'admin@test.co', 'password' => 'incorrecta'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_api_user_devuelve_permisos_denegados_solo_de_su_rol(): void
    {
        PermisoDenegado::query()->delete();
        PermisoDenegado::create(['rol' => 'th', 'modulo_id' => 'inventarios', 'submodulo_id' => 'dotacion']);
        PermisoDenegado::create(['rol' => 'tic', 'modulo_id' => 'sedes', 'submodulo_id' => '_modulo']);

        $this->actuarComo('th');
        $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('rol', 'th')
            ->assertJsonCount(1, 'permisos_denegados')
            ->assertJsonPath('permisos_denegados.0.modulo_id', 'inventarios');
    }

    public function test_admin_nunca_tiene_nada_denegado(): void
    {
        PermisoDenegado::create(['rol' => 'th', 'modulo_id' => 'inventarios', 'submodulo_id' => 'dotacion']);

        $this->actuarComo('admin');
        $this->getJson('/api/user')->assertOk()->assertJsonPath('permisos_denegados', []);
    }

    #[DataProvider('rutasSoloTalentoHumanoTic')]
    public function test_modulo_administrativo_y_seleccion_niegan_a_otros_roles(string $ruta): void
    {
        foreach (['operaciones', 'financiera', 'supervisores', 'general'] as $rol) {
            $this->actuarComo($rol);
            $this->getJson($ruta)->assertForbidden();
        }
    }

    #[DataProvider('rutasSoloTalentoHumanoTic')]
    public function test_roles_admin_th_tic_si_acceden_a_administrativo_y_seleccion(string $ruta): void
    {
        foreach (['admin', 'th', 'tic'] as $rol) {
            $this->actuarComo($rol);
            $this->getJson($ruta)->assertOk();
        }
    }

    public static function rutasSoloTalentoHumanoTic(): array
    {
        return [
            'empleados'     => ['/api/empleados'],
            'contratos'     => ['/api/contratos'],
            'base-ingresos' => ['/api/base-ingresos'],
            'requisiciones' => ['/api/requisiciones'],
            'candidatos'    => ['/api/candidatos'],
            'respuestas'    => ['/api/respuestas-ingresos'],
        ];
    }

    public function test_usuario_sin_rol_asignado_no_entra_a_modulos_restringidos(): void
    {
        $u = $this->usuario('general');
        $u->forceFill(['rol' => null])->saveQuietly();
        $this->actingAs($u->fresh());

        $this->getJson('/api/empleados')->assertForbidden();
    }

    public function test_check_email_indica_si_existe(): void
    {
        $this->usuario('th', ['email' => 'existe@test.co', 'name' => 'Ana Existe']);

        $this->postJson('/api/check-email', ['email' => 'existe@test.co'])
            ->assertOk()->assertJson(['exists' => true, 'name' => 'Ana Existe']);
        $this->postJson('/api/check-email', ['email' => 'no-existe@test.co'])
            ->assertOk()->assertJson(['exists' => false]);
    }

    /**
     * REGRESIÓN DE SEGURIDAD. El docblock de UserController::store dice "Solo un admin del
     * ERP puede llamar este endpoint", pero la ruta solo exige autenticación. Si este test
     * falla, cualquier usuario logueado puede crear cuentas (incluida una admin).
     */
    public function test_solo_admin_puede_crear_usuarios(): void
    {
        Http::fake();
        $this->actuarComo('general');

        $this->postJson('/api/users', [
            'name' => 'Intruso', 'email' => 'intruso@test.co', 'password' => 'Password123', 'rol' => 'admin',
        ])->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'intruso@test.co']);
    }

    public function test_admin_crea_usuario_y_se_replica_a_avanzaconoce(): void
    {
        Http::fake(['*' => Http::response(['id' => 777], 200)]);
        config(['sso.secret' => 'secreto-test', 'sso.avanzaconoce_api_url' => 'https://avanza.test']);
        $this->actuarComo('admin');

        $this->postJson('/api/users', [
            'name' => 'Nuevo Usuario', 'email' => 'nuevo@test.co', 'password' => 'Password123', 'rol' => 'operaciones',
        ])->assertCreated()->assertJsonPath('user.avanzaconoce_id', 777);

        $this->assertDatabaseHas('users', ['email' => 'nuevo@test.co', 'rol' => 'operaciones']);
        Http::assertSent(fn ($r) => $r->url() === 'https://avanza.test/api/erp/users'
            && $r->hasHeader('X-ERP-Secret', 'secreto-test'));
    }

    public function test_crear_usuario_valida_correo_unico_y_password_minima(): void
    {
        Http::fake();
        $this->usuario('general', ['email' => 'repetido@test.co']);
        $this->actuarComo('admin');

        $this->postJson('/api/users', ['name' => 'X', 'email' => 'repetido@test.co', 'password' => 'Password123'])
            ->assertStatus(422)->assertJsonValidationErrors('email');
        $this->postJson('/api/users', ['name' => 'X', 'email' => 'otro@test.co', 'password' => 'corta'])
            ->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_si_avanzaconoce_falla_el_usuario_igual_queda_creado_en_el_erp(): void
    {
        Http::fake(['*' => Http::response('error', 500)]);
        config(['sso.avanzaconoce_api_url' => 'https://avanza.test']);
        $this->actuarComo('admin');

        $this->postJson('/api/users', ['name' => 'Sin Sync', 'email' => 'sinsync@test.co', 'password' => 'Password123'])
            ->assertCreated();

        $this->assertNull(User::where('email', 'sinsync@test.co')->value('avanzaconoce_id'));
        $this->assertDatabaseHas('users', ['email' => 'sinsync@test.co']);
    }

    public function test_el_rol_se_deriva_del_cargo_y_admin_nunca_se_sobrescribe(): void
    {
        $th = User::factory()->create(['cargo' => 'Analista de Talento Humano']);
        $tic = User::factory()->create(['cargo' => 'Coordinador de Sistemas']);
        $otro = User::factory()->create(['cargo' => 'Vendedor']);

        $this->assertSame('th', $th->fresh()->rol);
        $this->assertSame('tic', $tic->fresh()->rol);
        $this->assertNull($otro->fresh()->rol);

        $admin = $this->usuario('admin');
        $admin->update(['cargo' => 'Vendedor']);
        $this->assertSame('admin', $admin->fresh()->rol);
    }
}
