<?php

namespace Tests\Feature\Catalogos;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Parametros: catálogos simples (crear / editar / nombre único / eliminar).
 */
class CatalogosCrudTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actuarComo('general'); // los catálogos solo exigen sesión, no rol
    }

    public static function catalogosConNombreUnico(): array
    {
        return [
            'empresas'          => ['/api/empresas',          'empresas'],
            'regionales'        => ['/api/regionales',        'regionales'],
            'clases-pedido'     => ['/api/clases-pedido',     'clases_pedido'],
            'conceptos-pedido'  => ['/api/conceptos-pedido',  'conceptos_pedido'],
            'formas-pago'       => ['/api/formas-pago',       'formas_pago'],
            'proyectos'         => ['/api/proyectos',         'proyectos'],
        ];
    }

    /** Campos extra que exige el flujo real (el frontend siempre manda el país de una empresa). */
    private function payload(string $tabla, string $nombre): array
    {
        return $tabla === 'empresas' ? ['nombre' => $nombre, 'pais' => 'Colombia'] : ['nombre' => $nombre];
    }

    #[DataProvider('catalogosConNombreUnico')]
    public function test_crear_editar_y_eliminar(string $url, string $tabla): void
    {
        $nombre = $this->unico('CAT');

        $id = $this->postJson($url, $this->payload($tabla, $nombre))->assertCreated()->json('id');
        $this->assertDatabaseHas($tabla, ['id' => $id, 'nombre' => $nombre]);

        $nuevo = $this->unico('CAT-EDIT');
        $this->putJson("$url/$id", $this->payload($tabla, $nuevo))->assertOk();
        $this->assertDatabaseHas($tabla, ['id' => $id, 'nombre' => $nuevo]);

        $this->deleteJson("$url/$id")->assertNoContent();
        $this->assertDatabaseMissing($tabla, ['id' => $id]);
    }

    #[DataProvider('catalogosConNombreUnico')]
    public function test_el_nombre_es_obligatorio_y_no_se_repite(string $url, string $tabla): void
    {
        $this->postJson($url, [])->assertStatus(422)->assertJsonValidationErrors('nombre');

        $nombre = $this->unico('DUP');
        $this->postJson($url, $this->payload($tabla, $nombre))->assertCreated();
        $this->postJson($url, $this->payload($tabla, $nombre))->assertStatus(422)->assertJsonValidationErrors('nombre');
    }

    #[DataProvider('catalogosConNombreUnico')]
    public function test_editar_un_registro_conservando_su_propio_nombre_no_da_error(string $url, string $tabla): void
    {
        $nombre = $this->unico('MISMO');
        $id = $this->postJson($url, $this->payload($tabla, $nombre))->assertCreated()->json('id');

        $this->putJson("$url/$id", $this->payload($tabla, $nombre))->assertOk();
    }

    public function test_los_catalogos_no_se_pueden_ver_sin_sesion(): void
    {
        $this->app['auth']->forgetGuards();
        $this->app->make('auth')->guard('web')->logout();

        $this->getJson('/api/regionales')->assertUnauthorized();
    }

    // ── Proyectos ────────────────────────────────────────────────────────────

    public function test_proyecto_se_asocia_a_una_empresa_existente(): void
    {
        $empresaId = $this->postJson('/api/empresas', ['nombre' => $this->unico('EMP'), 'pais' => 'Colombia'])->json('id');

        $this->postJson('/api/proyectos', ['nombre' => $this->unico('PRY'), 'empresa_id' => $empresaId])->assertCreated();
        $this->postJson('/api/proyectos', ['nombre' => $this->unico('PRY'), 'empresa_id' => 999999])
            ->assertStatus(422)->assertJsonValidationErrors('empresa_id');
    }

    public function test_proyecto_en_uso_no_se_puede_eliminar(): void
    {
        $proyectoId = $this->postJson('/api/proyectos', ['nombre' => $this->unico('PRY')])->json('id');
        DB::table('proyecto_sede')->insert([
            'proyecto_id' => $proyectoId, 'sede_id' => $this->sede(), 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->deleteJson("/api/proyectos/$proyectoId")->assertStatus(422);
        $this->assertDatabaseHas('proyectos', ['id' => $proyectoId]);
    }

    // ── Empresas ─────────────────────────────────────────────────────────────

    public function test_empresa_guarda_nit_pais_y_estado(): void
    {
        $id = $this->postJson('/api/empresas', [
            'nombre' => $this->unico('EMP'), 'nit' => '900123456-7', 'pais' => 'Ecuador', 'activo' => false,
        ])->assertCreated()->json('id');

        $this->assertDatabaseHas('empresas', ['id' => $id, 'nit' => '900123456-7', 'pais' => 'Ecuador', 'activo' => 0]);
    }

    /**
     * BUG: EmpresaController::store lee $data['pais'] aunque el campo sea opcional; si no
     * viene en la petición explota con "Undefined array key" (HTTP 500). Debería asumir
     * Colombia, que es lo que el código pretende.
     */
    public function test_empresa_sin_pais_usa_colombia_por_defecto(): void
    {
        $id = $this->postJson('/api/empresas', ['nombre' => $this->unico('EMP')])->assertCreated()->json('id');

        $this->assertDatabaseHas('empresas', ['id' => $id, 'pais' => 'Colombia']);
    }

    public function test_listado_publico_de_empresas_funciona_sin_sesion(): void
    {
        $this->app->make('auth')->guard('web')->logout();
        $this->getJson('/api/empresas')->assertOk();
    }

    // ── Tipos y categorías de producto ───────────────────────────────────────

    public function test_tipo_de_producto_exige_una_categoria_existente(): void
    {
        $this->postJson('/api/tipos-producto', ['nombre' => $this->unico('TP'), 'categoria' => 'Inexistente'])
            ->assertStatus(422)->assertJsonValidationErrors('categoria');

        $this->postJson('/api/tipos-producto', ['nombre' => $this->unico('TP'), 'categoria' => 'Equipos'])->assertCreated();
    }

    public function test_tipo_de_producto_nombre_unico(): void
    {
        $nombre = $this->unico('TP');
        $this->postJson('/api/tipos-producto', ['nombre' => $nombre, 'categoria' => 'EPP'])->assertCreated();
        $this->postJson('/api/tipos-producto', ['nombre' => $nombre, 'categoria' => 'EPP'])
            ->assertStatus(422)->assertJsonValidationErrors('nombre');
    }

    public function test_renombrar_una_categoria_actualiza_sus_tipos_de_producto(): void
    {
        $cat = $this->unico('CATEG');
        $catId = $this->postJson('/api/categorias-producto', ['nombre' => $cat])->assertCreated()->json('id');
        $tipoId = $this->postJson('/api/tipos-producto', ['nombre' => $this->unico('TP'), 'categoria' => $cat])->json('id');

        $nueva = $this->unico('CATEG-NUEVA');
        $this->putJson("/api/categorias-producto/$catId", ['nombre' => $nueva])->assertOk();

        $this->assertDatabaseHas('tipos_producto', ['id' => $tipoId, 'categoria' => $nueva]);
    }

    public function test_categoria_con_tipos_de_producto_no_se_elimina(): void
    {
        $cat = $this->unico('CATEG');
        $catId = $this->postJson('/api/categorias-producto', ['nombre' => $cat])->json('id');
        $this->postJson('/api/tipos-producto', ['nombre' => $this->unico('TP'), 'categoria' => $cat])->assertCreated();

        $this->deleteJson("/api/categorias-producto/$catId")->assertStatus(422);
        $this->assertDatabaseHas('categorias_producto', ['id' => $catId]);
    }

    public function test_categoria_sin_uso_si_se_elimina(): void
    {
        $catId = $this->postJson('/api/categorias-producto', ['nombre' => $this->unico('CATEG')])->json('id');
        $this->deleteJson("/api/categorias-producto/$catId")->assertNoContent();
    }

    // ── Proveedores ──────────────────────────────────────────────────────────

    public function test_proveedor_valida_naturaleza_y_nit_unico(): void
    {
        $nit = (string) random_int(100000000, 999999999);

        $this->postJson('/api/proveedores', ['nit' => $nit, 'naturaleza' => 'JURIDICA', 'nombre' => 'Proveedor Uno'])->assertCreated();
        $this->postJson('/api/proveedores', ['nit' => $nit, 'naturaleza' => 'NATURAL', 'nombre' => 'Otro'])
            ->assertStatus(422)->assertJsonValidationErrors('nit');
        $this->postJson('/api/proveedores', ['nit' => $nit . '1', 'naturaleza' => 'INVENTADA', 'nombre' => 'Otro'])
            ->assertStatus(422)->assertJsonValidationErrors('naturaleza');
    }

    // ── Empleadores y contactos ──────────────────────────────────────────────

    public function test_empleador_valida_tipo_y_administra_contactos(): void
    {
        $this->postJson('/api/empleadores', ['nombre' => 'Empleador X', 'tipo' => 'Otro'])->assertStatus(422);

        $id = $this->postJson('/api/empleadores', ['nombre' => $this->unico('EMPL'), 'tipo' => 'Directo'])
            ->assertCreated()->json('id');

        $regionalId = DB::table('regionales')->value('id');

        $contactoId = $this->postJson("/api/empleadores/$id/contactos", [
            'nombre' => 'Contacto Uno', 'correo' => 'contacto@test.co', 'regional_id' => $regionalId,
        ])->assertCreated()->json('id');

        // Correo inválido y sin regional se rechazan
        $this->postJson("/api/empleadores/$id/contactos", ['nombre' => 'X', 'correo' => 'no-es-correo', 'regional_id' => $regionalId])
            ->assertStatus(422);
        $this->postJson("/api/empleadores/$id/contactos", ['nombre' => 'X', 'correo' => 'x@test.co'])
            ->assertStatus(422);

        $this->putJson("/api/empleadores/$id/contactos/$contactoId", [
            'nombre' => 'Contacto Editado', 'correo' => 'nuevo@test.co', 'regional_id' => $regionalId,
        ])->assertOk();
        $this->assertDatabaseHas('empleador_contactos', ['id' => $contactoId, 'correo' => 'nuevo@test.co']);

        $this->deleteJson("/api/empleadores/$id/contactos/$contactoId")->assertNoContent();
        $this->assertDatabaseMissing('empleador_contactos', ['id' => $contactoId]);
    }

    // ── Centros de costo (catálogo) ──────────────────────────────────────────

    public function test_centro_de_costo_crear_y_rechazar_duplicado(): void
    {
        $payload = ['codigo' => 'ZZ' . random_int(100, 999), 'nombre' => 'CENTRO PRUEBA', 'ciudad' => 'PEREIRA', 'proyecto' => 'TIGO HOME'];

        $this->postJson('/api/centros-costo-catalogo', $payload)->assertCreated()->assertJsonPath('activo', true);
        $this->postJson('/api/centros-costo-catalogo', $payload)->assertStatus(422)->assertJsonValidationErrors('codigo');
    }

    public function test_listado_de_centros_de_costo_oculta_inactivos_salvo_all(): void
    {
        $id = $this->postJson('/api/centros-costo-catalogo', ['codigo' => 'INA1', 'nombre' => 'CENTRO INACTIVO', 'ciudad' => 'CALI'])
            ->json('id');
        $this->putJson("/api/centros-costo-catalogo/$id", ['codigo' => 'INA1', 'nombre' => 'CENTRO INACTIVO', 'ciudad' => 'CALI', 'activo' => false])
            ->assertOk();

        $activos = collect($this->getJson('/api/centros-costo-catalogo')->json());
        $todos = collect($this->getJson('/api/centros-costo-catalogo?all=1')->json());

        $this->assertFalse($activos->contains('id', $id));
        $this->assertTrue($todos->contains('id', $id));
    }

    public function test_centro_de_costo_se_puede_eliminar(): void
    {
        $id = $this->postJson('/api/centros-costo-catalogo', ['codigo' => 'DEL1', 'nombre' => 'PARA BORRAR'])->json('id');
        $this->deleteJson("/api/centros-costo-catalogo/$id")->assertNoContent();
        $this->assertDatabaseMissing('centros_costo_catalogo', ['id' => $id]);
    }
}
