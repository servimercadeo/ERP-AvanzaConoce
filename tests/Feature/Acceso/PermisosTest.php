<?php

namespace Tests\Feature\Acceso;

use App\Models\PermisoDenegado;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class PermisosTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    public function test_solo_admin_ve_y_edita_la_matriz(): void
    {
        foreach (['th', 'tic', 'gestor', 'consultor'] as $rol) {
            $this->actuarComo($rol);
            $this->getJson('/api/permisos')->assertForbidden();
            $this->putJson('/api/permisos', ['denegados' => []])->assertForbidden();
        }

        $this->actuarComo('admin');
        $this->getJson('/api/permisos')->assertOk();
    }

    public function test_sync_reemplaza_toda_la_matriz_y_descarta_duplicados(): void
    {
        PermisoDenegado::query()->delete();
        PermisoDenegado::create(['rol' => 'th', 'modulo_id' => 'sedes', 'submodulo_id' => '_modulo']);
        $this->actuarComo('admin');

        $this->putJson('/api/permisos', ['denegados' => [
            ['rol' => 'gestor', 'modulo_id' => 'inventarios', 'submodulo_id' => 'dotacion'],
            ['rol' => 'gestor', 'modulo_id' => 'inventarios', 'submodulo_id' => 'dotacion'],
            ['rol' => 'consultor', 'modulo_id' => 'parametros', 'submodulo_id' => 'empresas'],
        ]])->assertOk()->assertJsonCount(2);

        $this->assertDatabaseMissing('permisos_denegados', ['rol' => 'th', 'modulo_id' => 'sedes']);
        $this->assertSame(2, PermisoDenegado::count());
    }

    public function test_lo_que_no_viene_en_el_sync_vuelve_a_ser_visible(): void
    {
        PermisoDenegado::query()->delete();
        PermisoDenegado::create(['rol' => 'th', 'modulo_id' => 'sedes', 'submodulo_id' => '_modulo']);
        $this->actuarComo('admin');

        $this->putJson('/api/permisos', ['denegados' => []])->assertOk()->assertJsonCount(0);
        $this->assertSame(0, PermisoDenegado::count());
    }

    public function test_no_se_puede_denegar_a_admin_ni_a_roles_inventados(): void
    {
        $this->actuarComo('admin');

        $this->putJson('/api/permisos', ['denegados' => [
            ['rol' => 'admin', 'modulo_id' => 'sedes', 'submodulo_id' => '_modulo'],
        ]])->assertStatus(422)->assertJsonValidationErrors('denegados.0.rol');

        $this->putJson('/api/permisos', ['denegados' => [
            ['rol' => 'superusuario', 'modulo_id' => 'sedes', 'submodulo_id' => '_modulo'],
        ]])->assertStatus(422);
    }

    public function test_sync_invalido_no_borra_la_matriz_existente(): void
    {
        PermisoDenegado::query()->delete();
        PermisoDenegado::create(['rol' => 'th', 'modulo_id' => 'sedes', 'submodulo_id' => '_modulo']);
        $this->actuarComo('admin');

        $this->putJson('/api/permisos', ['denegados' => [['rol' => 'admin', 'modulo_id' => 'x', 'submodulo_id' => 'y']]])
            ->assertStatus(422);

        $this->assertSame(1, PermisoDenegado::count());
    }
}
