<?php

namespace Tests\Feature\Acceso;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Tema global (público de lectura), preferencias por usuario y catálogo de personas.
 */
class AjustesYPreferenciasTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    public function test_el_tema_global_se_lee_sin_sesion_y_solo_se_cambia_con_sesion(): void
    {
        $this->getJson('/api/settings')->assertOk()->assertJsonStructure(['theme']);

        $this->postJson('/api/settings', ['theme' => 'purple'])->assertUnauthorized();

        $this->actuarComo('general');
        $this->postJson('/api/settings', ['theme' => 'purple'])->assertOk()->assertJsonPath('theme', 'purple');
        $this->getJson('/api/settings')->assertJsonPath('theme', 'purple');
    }

    public function test_preferencias_por_defecto_y_actualizacion_parcial_que_conserva_lo_anterior(): void
    {
        $this->actuarComo('general');

        $this->getJson('/api/user/preferences')->assertOk()->assertJsonPath('preferences.theme', 'teal')->assertJsonPath('preferences.dark', false);

        $this->postJson('/api/user/preferences', ['preferences' => ['dark' => true]])->assertOk();
        $this->postJson('/api/user/preferences', ['preferences' => ['fontSize' => 'large']])->assertOk()
            ->assertJsonPath('preferences.dark', true)->assertJsonPath('preferences.fontSize', 'large');

        $this->getJson('/api/user/preferences')->assertJsonPath('preferences.dark', true);
    }

    public function test_preferencias_validan_los_valores_permitidos(): void
    {
        $this->actuarComo('general');

        $this->postJson('/api/user/preferences', ['preferences' => ['fontSize' => 'gigante']])->assertStatus(422);
        $this->postJson('/api/user/preferences', ['preferences' => ['navbar' => 'volador']])->assertStatus(422);
        $this->postJson('/api/user/preferences', [])->assertStatus(422)->assertJsonValidationErrors('preferences');
    }

    public function test_las_preferencias_son_por_usuario(): void
    {
        $this->actuarComo('general');
        $this->postJson('/api/user/preferences', ['preferences' => ['dark' => true]])->assertOk();

        $this->actuarComo('general');
        $this->getJson('/api/user/preferences')->assertJsonPath('preferences.dark', false);
    }

    public function test_catalogo_de_usuarios_solo_muestra_activos_con_nombre_y_sin_datos_sensibles(): void
    {
        $this->usuario('general', ['name' => 'Activo Visible', 'activo' => true, 'cargo' => 'ANALISTA']);
        $this->usuario('general', ['name' => 'Inactivo Oculto', 'activo' => false]);
        $this->actuarComo('general');

        $r = $this->getJson('/api/usuarios-catalogo')->assertOk();

        $nombres = collect($r->json())->pluck('name');
        $this->assertTrue($nombres->contains('Activo Visible'));
        $this->assertFalse($nombres->contains('Inactivo Oculto'));
        $this->assertSame(['id', 'name', 'cargo'], array_keys($r->json('0')), 'No debe exponer correo, cédula ni contraseña.');
    }

    public function test_catalogos_publicos_para_formularios(): void
    {
        $this->getJson('/api/catalogos')->assertOk()->assertJsonStructure([
            'cargos', 'eps', 'arls', 'cajas', 'pensiones', 'bancos', 'tipos_rh', 'sedes', 'regionales', 'empleadores', 'ciudades', 'sedes_por_ciudad',
        ]);
    }
}
