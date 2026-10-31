<?php

namespace Tests\Feature\Inventario;

use App\Models\Aliado;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\UsuarioAliadoEmpresa;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * El aliado empresa entra al ERP (SSO desde AvanzaConoce o correo + contraseña) y solo ve
 * su ficha (con las Work Orders de sus técnicos), nunca el módulo Work Orders.
 */
class AccesoAliadoEmpresaTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private function aliadoConTecnico(string $nit, string $correo, string $cedulaTecnico): Aliado
    {
        $aliado = Aliado::create([
            'tipo' => Aliado::EMPRESA, 'tipo_documento' => 'NIT', 'documento' => $nit, 'nombre' => "EMPRESA {$nit}",
            'telefono' => '3001112233', 'correo' => $correo, 'ciudad' => 'MEDELLIN', 'direccion' => 'Calle 1', 'activo' => true,
        ]);
        $aliado->forceFill(['avanza_password' => Hash::make('Clave-de-avanza-1')])->saveQuietly();
        app(UsuarioAliadoEmpresa::class)->asegurar($aliado);

        $tecnico = $this->usuario('general', ['cedula' => $cedulaTecnico, 'email' => "{$cedulaTecnico}@tecnicos.co"]);
        $tecnico->forceFill(['rol' => 'tecnico', 'aliado_id' => $aliado->id])->save();
        WorkOrder::create(['numero_wo' => "WO-{$cedulaTecnico}", 'numero_item' => '1', 'cedula_tecnico' => $cedulaTecnico, 'estado' => 'Atendido']);

        return $aliado->fresh();
    }

    public function test_entra_con_correo_y_la_contrasena_de_avanzaconoce(): void
    {
        $aliado = $this->aliadoConTecnico('900111222-3', 'gerencia@empresa.co', '7001');

        $this->postJson('/login', ['email' => 'gerencia@empresa.co', 'password' => 'Clave-de-avanza-1'])->assertOk()
            ->assertJsonPath('user.rol', 'aliado')
            ->assertJsonPath('user.aliado_empresa_id', $aliado->id)
            ->assertJsonPath('user.cedula', '9001112223');
    }

    public function test_entra_desde_avanzaconoce_con_ir_al_erp(): void
    {
        config(['sso.secret' => 'secreto-de-prueba-de-32-caracteres-min']);
        $aliado = $this->aliadoConTecnico('900111222-3', 'gerencia@empresa.co', '7001');

        // AvanzaConoce firma el token con el `nit` de su usuario: el NIT sin guion.
        $token = \Firebase\JWT\JWT::encode(['sub' => 1196, 'email' => 'gerencia@empresa.co', 'nit' => '9001112223', 'exp' => time() + 60],
            'secreto-de-prueba-de-32-caracteres-min', 'HS256');

        $this->get('/sso/login?token=' . $token)->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs(User::findOrFail($aliado->usuario_id));
        $this->getJson('/api/user')->assertOk()->assertJsonPath('aliado_empresa_id', $aliado->id);

        // Aliado inactivo: ya no entra.
        $aliado->update(['activo' => false]);
        app(UsuarioAliadoEmpresa::class)->sincronizar($aliado);
        auth()->guard('web')->logout();
        $this->get('/sso/login?token=' . $token)->assertRedirect('/login?sso_error=sin_acceso');
    }

    public function test_solo_ve_su_aliado_y_no_el_modulo_work_orders(): void
    {
        $suyo = $this->aliadoConTecnico('900111222-3', 'gerencia@empresa.co', '7001');
        $otro = $this->aliadoConTecnico('800333444-5', 'otra@empresa.co', '7002');
        WorkOrder::create(['numero_wo' => 'WO-SUELTA', 'numero_item' => '1', 'cedula_tecnico' => '7999', 'estado' => 'Atendido']);
        $this->actingAs(User::findOrFail($suyo->usuario_id));

        $lista = $this->getJson('/api/aliados?page=1')->assertOk();
        $this->assertSame([$suyo->id], collect($lista->json('data'))->pluck('id')->all());
        $this->getJson("/api/aliados/{$suyo->id}")->assertOk()->assertJsonPath('tecnicos.0.cedula', '7001');
        $this->getJson("/api/aliados/{$otro->id}")->assertNotFound();
        $this->getJson("/api/aliados/{$otro->id}/work-orders")->assertNotFound();

        // En su ficha ve las WO de sus técnicos; el módulo Work Orders no lo ve.
        $this->assertSame(['WO-7001'], collect($this->getJson("/api/aliados/{$suyo->id}/work-orders?page=1")->assertOk()->json('data'))->pluck('numero_wo')->all());
        $this->getJson('/api/work-orders')->assertForbidden();
        $this->getJson('/api/work-orders/resumen')->assertForbidden();
    }

    public function test_no_llega_a_nada_mas_ni_puede_modificar(): void
    {
        $aliado = $this->aliadoConTecnico('900111222-3', 'gerencia@empresa.co', '7001');
        $this->actingAs(User::findOrFail($aliado->usuario_id));
        $wo = WorkOrder::firstOrFail();

        foreach (['/api/empleados', '/api/contratos', '/api/sedes', '/api/usuarios-catalogo', '/api/inventario-productos', '/api/aliados/jefes'] as $url) {
            $this->getJson($url)->assertForbidden();
        }
        $this->putJson("/api/aliados/{$aliado->id}", ['nombre' => 'X'])->assertForbidden();
        $this->postJson("/api/aliados/{$aliado->id}/tecnicos", [])->assertForbidden();
        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Finalizado'])->assertForbidden();
        $this->assertSame('Atendido', $wo->fresh()->estado);
    }

    public function test_su_usuario_no_es_empleado_y_sigue_al_aliado(): void
    {
        $this->actuarComo('admin');
        $aliado = $this->aliadoConTecnico('900111222-3', 'gerencia@empresa.co', '7001');

        $this->assertNotContains('9001112223', collect($this->getJson('/api/empleados')->json())->pluck('cedula')->all());
        $this->assertNotContains($aliado->usuario_id, collect($this->getJson('/api/usuarios-catalogo')->json())->pluck('id')->all());

        // Inactivar el aliado deja sin acceso a su usuario.
        $aliado->update(['activo' => false]);
        app(UsuarioAliadoEmpresa::class)->sincronizar($aliado);
        $this->assertFalse(User::findOrFail($aliado->usuario_id)->activo);
    }

    public function test_no_se_apodera_del_usuario_de_otra_persona(): void
    {
        $this->usuario('general', ['cedula' => '9001112223', 'email' => 'empleado@empresa.co']);
        $aliado = Aliado::create([
            'tipo' => Aliado::EMPRESA, 'tipo_documento' => 'NIT', 'documento' => '900111222-3', 'nombre' => 'EMPRESA',
            'telefono' => '3001112233', 'correo' => 'gerencia@empresa.co', 'ciudad' => 'MEDELLIN', 'direccion' => 'Calle 1', 'activo' => true,
        ]);

        $resultado = app(UsuarioAliadoEmpresa::class)->asegurar($aliado);

        $this->assertSame('conflicto', $resultado['estado']);
        $this->assertNull($aliado->fresh()->usuario_id);
        $this->assertSame(1, User::where('cedula', '9001112223')->count());
    }
}
