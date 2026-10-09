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
        foreach (['th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general'] as $rol) {
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
            ['rol' => 'operaciones', 'modulo_id' => 'inventarios', 'submodulo_id' => 'dotacion'],
            ['rol' => 'operaciones', 'modulo_id' => 'inventarios', 'submodulo_id' => 'dotacion'],
            ['rol' => 'general', 'modulo_id' => 'parametros', 'submodulo_id' => 'empresas'],
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

    // ── Los checks de la matriz controlan el acceso real a los datos (no solo el menú) ──

    /** Guarda la matriz como lo hace el módulo Permisos: quita o agrega denegaciones. */
    private function guardarMatriz(callable $cambio): void
    {
        $this->actuarComo('admin');
        $filas = PermisoDenegado::all(['rol', 'modulo_id', 'submodulo_id', 'archivo_id'])
            ->map(fn ($f) => $f->only('rol', 'modulo_id', 'submodulo_id', 'archivo_id'));
        $this->putJson('/api/permisos', ['denegados' => $cambio($filas)->values()->all()])->assertOk();
    }

    private function sin($filas, string $rol, string $modulo, ?string $submodulo = null)
    {
        return $filas->reject(fn ($f) => $f['rol'] === $rol && $f['modulo_id'] === $modulo
            && ($submodulo === null || $f['submodulo_id'] === $submodulo));
    }

    public function test_activar_administrativo_a_otro_rol_le_da_acceso_a_sus_datos(): void
    {
        // Por defecto Operaciones no tiene Administrativo.
        $this->actuarComo('operaciones');
        $this->getJson('/api/empleados')->assertForbidden();
        $this->getJson('/api/requisiciones')->assertForbidden();

        $this->guardarMatriz(fn ($f) => $this->sin($f, 'operaciones', 'administrativo', 'empleados'));

        $this->actuarComo('operaciones');
        // El menú (que sale de /api/user) ya no se lo oculta.
        $denegados = collect($this->getJson('/api/user')->assertOk()->json('permisos_denegados'));
        $this->assertFalse($denegados->contains(fn ($p) => $p['modulo_id'] === 'administrativo' && $p['submodulo_id'] === 'empleados'));
        $this->assertTrue($denegados->contains(fn ($p) => $p['modulo_id'] === 'administrativo' && $p['submodulo_id'] === 'seleccion'));
        $this->getJson('/api/empleados')->assertOk();
        // Solo lo activado: Selección y Contratos siguen cerrados.
        $this->getJson('/api/requisiciones')->assertForbidden();
        $this->getJson('/api/contratos')->assertForbidden();
    }

    public function test_desactivar_un_submodulo_le_cierra_sus_datos_a_ese_rol(): void
    {
        $this->actuarComo('th');
        $this->getJson('/api/requisiciones')->assertOk();
        $this->getJson('/api/candidatos')->assertOk();

        $this->guardarMatriz(fn ($f) => $f->push(['rol' => 'th', 'modulo_id' => 'administrativo', 'submodulo_id' => 'seleccion']));

        $this->actuarComo('th');
        $this->getJson('/api/requisiciones')->assertForbidden();
        $this->getJson('/api/candidatos')->assertForbidden();
        // Lo compartido con Administración de Contratos (que sigue activo) se mantiene.
        $this->getJson('/api/base-ingresos')->assertOk();
        $this->getJson('/api/contratos')->assertOk();
        // Otro rol no se ve afectado.
        $this->actuarComo('tic');
        $this->getJson('/api/requisiciones')->assertOk();
    }

    public function test_desactivar_contratos_y_empleados_cierra_esas_apis(): void
    {
        $this->guardarMatriz(fn ($f) => $f
            ->push(['rol' => 'tic', 'modulo_id' => 'administrativo', 'submodulo_id' => 'admin_contratos'])
            ->push(['rol' => 'tic', 'modulo_id' => 'administrativo', 'submodulo_id' => 'empleados']));

        $this->actuarComo('tic');
        $this->getJson('/api/contratos')->assertForbidden();
        $this->getJson('/api/empleados')->assertForbidden();
        $this->getJson('/api/respuestas-ingresos')->assertForbidden();
        $this->getJson('/api/requisiciones')->assertOk();
    }

    public function test_activar_permisos_a_un_rol_le_deja_gestionar_la_matriz_y_no_la_auditoria(): void
    {
        $this->guardarMatriz(fn ($f) => $this->sin($f, 'th', 'permisos', 'roles_permisos'));

        $this->actuarComo('th');
        $this->getJson('/api/permisos')->assertOk();
        $this->getJson('/api/auditoria')->assertForbidden();

        $this->guardarMatriz(fn ($f) => $this->sin($f, 'th', 'permisos'));
        $this->actuarComo('th');
        $this->getJson('/api/auditoria')->assertOk();
    }

    // ── Permisos por pestaña ──

    public function test_sync_guarda_pestanas_y_la_sesion_las_recibe(): void
    {
        $this->guardarMatriz(fn ($f) => $f
            ->push(['rol' => 'th', 'modulo_id' => 'administrativo', 'submodulo_id' => 'seleccion', 'archivo_id' => 'base_ingreso'])
            // Sin archivo_id (como lo mandaba la versión anterior): todo el submódulo.
            ->push(['rol' => 'th', 'modulo_id' => 'sedes', 'submodulo_id' => '_modulo']));

        $this->assertDatabaseHas('permisos_denegados', ['rol' => 'th', 'submodulo_id' => 'seleccion', 'archivo_id' => 'base_ingreso']);
        $this->assertDatabaseHas('permisos_denegados', ['rol' => 'th', 'modulo_id' => 'sedes', 'archivo_id' => '']);

        $this->actuarComo('th');
        $denegados = collect($this->getJson('/api/user')->assertOk()->json('permisos_denegados'));
        $this->assertTrue($denegados->contains(fn ($p) => $p['submodulo_id'] === 'seleccion' && $p['archivo_id'] === 'base_ingreso'));
    }

    public function test_quitar_una_pestana_cierra_solo_sus_datos(): void
    {
        $this->guardarMatriz(fn ($f) => $f
            ->push(['rol' => 'th', 'modulo_id' => 'administrativo', 'submodulo_id' => 'admin_contratos', 'archivo_id' => 'respuestas_formulario']));

        $this->actuarComo('th');
        $this->getJson('/api/respuestas-ingresos')->assertForbidden();
        // Las demás pestañas de Administración de Contratos siguen abiertas.
        $this->getJson('/api/contratos')->assertOk();
        $this->getJson('/api/base-ingresos')->assertOk();
        $this->getJson('/api/respuestas-ingresos/datos-contrato')->assertOk();
        // Otro rol no se ve afectado.
        $this->actuarComo('tic');
        $this->getJson('/api/respuestas-ingresos')->assertOk();
    }

    public function test_una_api_compartida_sigue_abierta_mientras_alguna_pestana_que_la_usa_lo_este(): void
    {
        // Requisiciones la usan "Proceso de Selección" y "Candidatos".
        $this->guardarMatriz(fn ($f) => $f
            ->push(['rol' => 'th', 'modulo_id' => 'administrativo', 'submodulo_id' => 'seleccion', 'archivo_id' => 'proceso_seleccion']));
        $this->actuarComo('th');
        $this->getJson('/api/requisiciones')->assertOk();

        $this->guardarMatriz(fn ($f) => $f
            ->push(['rol' => 'th', 'modulo_id' => 'administrativo', 'submodulo_id' => 'seleccion', 'archivo_id' => 'candidatos']));
        $this->actuarComo('th');
        $this->getJson('/api/requisiciones')->assertForbidden();
        // Candidatos también lo usa "Base de Ingreso", que sigue abierta.
        $this->getJson('/api/candidatos')->assertOk();
    }

    public function test_negar_el_submodulo_niega_todas_sus_pestanas(): void
    {
        $th = $this->actuarComo('th');
        PermisoDenegado::create(['rol' => 'th', 'modulo_id' => 'administrativo', 'submodulo_id' => 'seleccion']);

        $this->assertFalse(PermisoDenegado::permite($th, 'administrativo', 'seleccion'));
        $this->assertFalse(PermisoDenegado::permite($th, 'administrativo', 'seleccion', 'candidatos'));
        $this->assertTrue(PermisoDenegado::permite($th, 'administrativo', 'admin_contratos', 'avales_contratacion'));
    }

    public function test_admin_siempre_tiene_acceso_aunque_la_matriz_niegue_todo(): void
    {
        $this->actuarComo('admin');
        foreach (['/api/empleados', '/api/contratos', '/api/requisiciones', '/api/permisos', '/api/auditoria'] as $ruta) {
            $this->getJson($ruta)->assertOk();
        }
    }
}
