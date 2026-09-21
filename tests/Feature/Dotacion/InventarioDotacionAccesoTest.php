<?php

namespace Tests\Feature\Dotacion;

use App\Models\InventarioDotacion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Inventarios > Dotación > Inventario de dotación, con la regla de visibilidad por empresa:
 *   SERVICIOS Y MERCADEO COL -> TIGO EXPRESS / TIGO HOME / ADMINISTRATIVO
 *   SERVIMERCADEO COL        -> DIRECTV
 *   sin empresa / otra       -> todos
 */
class InventarioDotacionAccesoTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private const TODAS = ['SYM TIGO EXPRESS', 'SYM TIGO HOME', 'SYM ADMINISTRATIVO', 'DIRECTV'];

    protected function setUp(): void
    {
        parent::setUp();
        Cache::store('file')->forget('inventario-dotacion:flat');

        foreach (self::TODAS as $proyecto) {
            $this->prenda($proyecto, 'CAMISA ' . $proyecto, 'Masculino', 'M', 10);
        }
    }

    protected function tearDown(): void
    {
        Cache::store('file')->forget('inventario-dotacion:flat');
        parent::tearDown();
    }

    private function prenda(string $proyecto, string $prenda, string $genero, string $talla, int $cantidad, ?int $sedeId = null): InventarioDotacion
    {
        return InventarioDotacion::create([
            'proyecto' => $proyecto, 'sede_id' => $sedeId, 'prenda' => $prenda, 'genero' => $genero,
            'talla' => $talla, 'precio' => 5000, 'cantidad' => $cantidad, 'stock_minimo' => 2,
        ]);
    }

    private function usuarioDeEmpresa(?string $empresa): User
    {
        $atributos = [];
        if ($empresa) {
            $atributos['empresa_id'] = DB::table('empresas')->insertGetId([
                'nombre' => $empresa, 'pais' => 'Colombia', 'activo' => true, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        return $this->actuarComo('consultor', $atributos);
    }

    public function test_sym_ve_solo_sus_tres_proyectos(): void
    {
        $this->usuarioDeEmpresa('SERVICIOS Y MERCADEO COL');

        $this->getJson('/api/inventario-dotacion/proyectos')->assertOk()
            ->assertExactJson(['SYM TIGO EXPRESS', 'SYM TIGO HOME', 'SYM ADMINISTRATIVO']);
    }

    public function test_servimercadeo_ve_solo_directv(): void
    {
        $this->usuarioDeEmpresa('SERVIMERCADEO COL');

        $this->getJson('/api/inventario-dotacion/proyectos')->assertOk()->assertExactJson(['DIRECTV']);
    }

    public function test_usuario_sin_empresa_o_de_empresa_no_sujeta_a_la_regla_ve_todos(): void
    {
        $this->usuarioDeEmpresa(null);
        $this->getJson('/api/inventario-dotacion/proyectos')->assertOk()->assertJsonCount(4);

        $this->usuarioDeEmpresa('ALTYCOM');
        $this->getJson('/api/inventario-dotacion/proyectos')->assertOk()->assertJsonCount(4);
    }

    public function test_la_empresa_se_toma_del_contrato_si_el_usuario_no_tiene_empresa_id(): void
    {
        $u = $this->actuarComo('consultor');
        DB::table('contratos')->insert([
            'empleado_id' => $u->id, 'empresa' => 'SERVIMERCADEO COL', 'estado_contrato' => 'Activo',
            'fecha_ingreso' => now()->toDateString(), 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->getJson('/api/inventario-dotacion/proyectos')->assertOk()->assertExactJson(['DIRECTV']);
    }

    public function test_el_listado_filtrado_solo_trae_proyectos_permitidos(): void
    {
        $this->usuarioDeEmpresa('SERVIMERCADEO COL');

        $proyectos = collect($this->getJson('/api/inventario-dotacion?proyecto=Todos&per_page=50')->assertOk()->json('data'))
            ->pluck('proyecto')->unique()->values()->all();

        $this->assertSame(['DIRECTV'], $proyectos);
    }

    /**
     * FUGA DE DATOS. El catálogo "sin filtros ni per_page" se sirve desde una caché global
     * (misma respuesta "para cualquier usuario") y por eso se salta el filtro por empresa
     * que sí aplican los demás caminos. Un usuario de Servimercadeo termina viendo los
     * proyectos de TIGO. PedidosAutomaticosCrud y PedidosGlobalesCrud piden justo ese
     * catálogo completo.
     */
    public function test_el_catalogo_completo_sin_filtros_tambien_respeta_la_empresa(): void
    {
        $this->usuarioDeEmpresa('SERVIMERCADEO COL');

        $proyectos = collect($this->getJson('/api/inventario-dotacion')->assertOk()->json())
            ->pluck('proyecto')->unique()->values()->all();

        $this->assertSame(['DIRECTV'], $proyectos);
    }

    public function test_la_cache_del_catalogo_no_filtra_datos_entre_usuarios_de_distinta_empresa(): void
    {
        // Un usuario sin restricción llena la caché...
        $this->usuarioDeEmpresa(null);
        $this->getJson('/api/inventario-dotacion')->assertOk();

        // ...y un usuario restringido no debe verla.
        $this->usuarioDeEmpresa('SERVIMERCADEO COL');
        $proyectos = collect($this->getJson('/api/inventario-dotacion')->json())->pluck('proyecto')->unique()->all();

        $this->assertNotContains('SYM TIGO EXPRESS', $proyectos);
    }

    public function test_resumen_y_filtros_solo_cuentan_proyectos_permitidos(): void
    {
        $this->usuarioDeEmpresa('SERVICIOS Y MERCADEO COL');

        $resumen = $this->getJson('/api/inventario-dotacion/resumen')->assertOk()->json();
        $this->assertArrayNotHasKey('DIRECTV', $resumen['por_proyecto'] ?? $resumen);

        $prendas = $this->getJson('/api/inventario-dotacion/filtros')->assertOk()->json('prendas');
        $this->assertNotContains('CAMISA DIRECTV', $prendas);
        $this->assertContains('CAMISA SYM TIGO HOME', $prendas);
    }

    public function test_no_se_puede_crear_editar_ni_borrar_en_un_proyecto_ajeno(): void
    {
        $this->usuarioDeEmpresa('SERVIMERCADEO COL');
        $ajeno = InventarioDotacion::where('proyecto', 'SYM TIGO HOME')->first();

        $this->postJson('/api/inventario-dotacion', [
            'proyecto' => 'SYM TIGO HOME', 'prenda' => 'X', 'genero' => 'Masculino', 'talla' => 'M', 'cantidad' => 1,
        ])->assertForbidden();

        $this->putJson("/api/inventario-dotacion/{$ajeno->id}", ['cantidad' => 999])->assertForbidden();
        $this->deleteJson("/api/inventario-dotacion/{$ajeno->id}")->assertForbidden();

        $this->assertSame(10, $ajeno->fresh()->cantidad);
    }

    public function test_carga_masiva_e_importacion_rechazan_proyectos_ajenos(): void
    {
        $this->usuarioDeEmpresa('SERVIMERCADEO COL');
        $item = ['proyecto' => 'SYM TIGO EXPRESS', 'prenda' => 'X', 'genero' => 'Femenino', 'talla' => 'S', 'cantidad' => 1];

        $this->postJson('/api/inventario-dotacion/bulk', ['items' => [$item]])->assertForbidden();
        $this->postJson('/api/inventario-dotacion/import', ['items' => [$item]])->assertForbidden();

        $this->assertDatabaseMissing('inventario_dotacion', ['prenda' => 'X']);
    }

    public function test_sedes_disponibles_de_un_proyecto_ajeno_vienen_vacias(): void
    {
        $this->usuarioDeEmpresa('SERVIMERCADEO COL');

        $this->getJson('/api/inventario-dotacion/sedes?proyecto=SYM TIGO HOME')->assertOk()->assertExactJson([]);
    }

    public function test_crear_en_un_proyecto_propio_actualiza_si_ya_existia(): void
    {
        $this->usuarioDeEmpresa('SERVIMERCADEO COL');
        $body = ['proyecto' => 'DIRECTV', 'prenda' => 'CHALECO', 'genero' => 'Masculino', 'talla' => 'L', 'cantidad' => 4, 'precio' => 100];

        $this->postJson('/api/inventario-dotacion', $body)->assertCreated();
        $this->postJson('/api/inventario-dotacion', array_merge($body, ['cantidad' => 9]))->assertCreated();

        $this->assertSame(1, InventarioDotacion::where('prenda', 'CHALECO')->count());
        $this->assertSame(9, InventarioDotacion::where('prenda', 'CHALECO')->value('cantidad'));
    }

    public function test_una_sede_debe_pertenecer_al_proyecto_elegido(): void
    {
        $this->usuarioDeEmpresa(null);
        $sedeSuelta = $this->sede();

        $this->postJson('/api/inventario-dotacion', [
            'proyecto' => 'DIRECTV', 'sede_id' => $sedeSuelta, 'prenda' => 'X', 'genero' => 'Masculino', 'talla' => 'M', 'cantidad' => 1,
        ])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'no pertenece al proyecto'));
    }

    public function test_una_sede_vinculada_al_proyecto_si_se_acepta(): void
    {
        $this->usuarioDeEmpresa(null);
        $sede = $this->sede();
        $proyectoId = DB::table('proyectos')->where('nombre', 'DIRECTV CO')->value('id');
        DB::table('proyecto_sede')->insert(['proyecto_id' => $proyectoId, 'sede_id' => $sede, 'created_at' => now(), 'updated_at' => now()]);

        $this->postJson('/api/inventario-dotacion', [
            'proyecto' => 'DIRECTV', 'sede_id' => $sede, 'prenda' => 'GORRA', 'genero' => 'Masculino', 'talla' => 'U', 'cantidad' => 3,
        ])->assertCreated();

        $this->getJson('/api/inventario-dotacion/sedes?proyecto=DIRECTV')->assertOk()->assertJsonFragment(['id' => $sede]);
    }

    public function test_validaciones_de_alta(): void
    {
        $this->usuarioDeEmpresa(null);

        $this->postJson('/api/inventario-dotacion', [])->assertStatus(422)
            ->assertJsonValidationErrors(['proyecto', 'prenda', 'genero', 'talla', 'cantidad']);
        $this->postJson('/api/inventario-dotacion', ['proyecto' => 'INVENTADO', 'prenda' => 'X', 'genero' => 'Masculino', 'talla' => 'M', 'cantidad' => 1])
            ->assertStatus(422)->assertJsonValidationErrors('proyecto');
        $this->postJson('/api/inventario-dotacion', ['proyecto' => 'DIRECTV', 'prenda' => 'X', 'genero' => 'Otro', 'talla' => 'M', 'cantidad' => 1])
            ->assertStatus(422)->assertJsonValidationErrors('genero');
    }
}
