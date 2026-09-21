<?php

namespace Tests\Feature\Dotacion;

use App\Mail\ActaEntregaDotacionMail;
use App\Models\InventarioDotacion;
use App\Models\PedidoAutomatico;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class PedidosGlobalesYCronogramaTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private int $regionalEjeCafetero;
    private InventarioDotacion $camisa;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Cache::store('file')->forget('inventario-dotacion:flat');
        $this->actuarComo('consultor', ['name' => 'Quien Confirma']);

        $this->regionalEjeCafetero = DB::table('regionales')->where('nombre', 'EJE CAFETERO')->value('id');
        $this->camisa = InventarioDotacion::create([
            'proyecto' => 'SYM TIGO HOME', 'prenda' => 'CAMISA', 'genero' => 'Masculino', 'talla' => 'M',
            'precio' => 1000, 'cantidad' => 20, 'stock_minimo' => 0,
        ]);
    }

    /** Pedido automático Activo, de un empleado con contrato del proyecto/regional dados. */
    private function pedidoActivo(string $proyecto = 'TIGO HOME', ?int $regionalId = null, array $empleado = []): PedidoAutomatico
    {
        $emp = $this->usuario('consultor', array_merge([
            'nombres' => 'Emp', 'apellidos' => $this->unico('AP'), 'cedula' => (string) random_int(10000, 99999999),
        ], $empleado));

        $contratoId = DB::table('contratos')->insertGetId([
            'empleado_id' => $emp->id, 'cliente_proyecto' => $proyecto, 'regional_id' => $regionalId ?? $this->regionalEjeCafetero,
            'estado_contrato' => 'Activo', 'fecha_ingreso' => now()->toDateString(), 'created_at' => now(), 'updated_at' => now(),
        ]);

        $id = $this->postJson('/api/pedidos-automaticos', [
            'empleado_id' => $emp->id, 'contrato_id' => $contratoId,
            'items' => [['inventario_dotacion_id' => $this->camisa->id, 'cantidad' => 1]],
        ])->assertCreated()->json('id');

        return PedidoAutomatico::find($id);
    }

    // ── Pedidos globales ─────────────────────────────────────────────────────

    public function test_sin_pedidos_en_proceso_no_se_puede_generar_un_global(): void
    {
        $this->postJson('/api/pedidos-globales', ['proyecto' => 'TIGO HOME'])->assertStatus(422);
        $this->assertDatabaseCount('pedidos_globales', 0);
    }

    public function test_generar_global_agrupa_los_pedidos_activos_del_proyecto_y_regional(): void
    {
        $a = $this->pedidoActivo('TIGO HOME');
        $b = $this->pedidoActivo('TIGO HOME');
        $otroProyecto = $this->pedidoActivo('DIRECTV CO');
        $otraRegional = $this->pedidoActivo('TIGO HOME', DB::table('regionales')->where('nombre', 'COSTA')->value('id'));

        $r = $this->postJson('/api/pedidos-globales', ['proyecto' => 'TIGO HOME', 'notas' => 'Lote 1'])
            ->assertCreated()->assertJsonPath('total', 2);

        $globalId = $r->json('global.id');
        $this->assertSame($globalId, $a->fresh()->pedido_global_id);
        $this->assertSame('Completado', $a->fresh()->estado);
        $this->assertSame('Completado', $b->fresh()->estado);
        $this->assertSame('Activo', $otroProyecto->fresh()->estado);
        $this->assertNull($otraRegional->fresh()->pedido_global_id);
    }

    public function test_un_pedido_ya_agrupado_no_entra_en_un_segundo_global(): void
    {
        $this->pedidoActivo('TIGO HOME');
        $this->postJson('/api/pedidos-globales', ['proyecto' => 'TIGO HOME'])->assertCreated();

        $this->postJson('/api/pedidos-globales', ['proyecto' => 'TIGO HOME'])->assertStatus(422);
    }

    public function test_el_proyecto_es_obligatorio(): void
    {
        $this->postJson('/api/pedidos-globales', [])->assertStatus(422)->assertJsonValidationErrors('proyecto');
    }

    public function test_eliminar_un_global_devuelve_sus_pedidos_a_activo(): void
    {
        $p = $this->pedidoActivo('TIGO HOME');
        $globalId = $this->postJson('/api/pedidos-globales', ['proyecto' => 'TIGO HOME'])->json('global.id');

        $this->deleteJson("/api/pedidos-globales/$globalId")->assertNoContent();

        $this->assertSame('Activo', $p->fresh()->estado);
        $this->assertNull($p->fresh()->pedido_global_id);
    }

    public function test_no_se_puede_confirmar_la_entrega_sin_confirmar_antes_el_pedido(): void
    {
        $this->pedidoActivo('TIGO HOME');
        $globalId = $this->postJson('/api/pedidos-globales', ['proyecto' => 'TIGO HOME'])->json('global.id');

        $this->putJson("/api/pedidos-globales/$globalId", ['entrega_confirmada' => true])->assertStatus(422);

        Mail::assertNothingSent();
    }

    public function test_confirmar_el_pedido_registra_la_fecha(): void
    {
        $this->pedidoActivo('TIGO HOME');
        $globalId = $this->postJson('/api/pedidos-globales', ['proyecto' => 'TIGO HOME'])->json('global.id');

        $this->putJson("/api/pedidos-globales/$globalId", ['confirmado' => true])->assertOk()->assertJsonPath('confirmado', true);

        $this->assertNotNull(DB::table('pedidos_globales')->where('id', $globalId)->value('confirmado_at'));
    }

    public function test_confirmar_la_entrega_envia_el_acta_a_cada_empleado_con_correo_real(): void
    {
        $this->pedidoActivo('TIGO HOME', null, ['email' => 'ana@test.co']);
        $this->pedidoActivo('TIGO HOME', null, ['cedula' => '777', 'email' => '777@avanzaconoce.com']); // sin correo real
        $globalId = $this->postJson('/api/pedidos-globales', ['proyecto' => 'TIGO HOME'])->json('global.id');
        $this->putJson("/api/pedidos-globales/$globalId", ['confirmado' => true])->assertOk();

        $r = $this->putJson("/api/pedidos-globales/$globalId", ['entrega_confirmada' => true])->assertOk();

        $r->assertJsonCount(1, 'actas_entrega.enviadas')->assertJsonCount(1, 'actas_entrega.omitidas')
            ->assertJsonPath('actas_entrega.enviadas.0.correo', 'ana@test.co')
            ->assertJsonPath('actas_entrega.omitidas.0.motivo', 'Sin correo real registrado');
        Mail::assertSent(ActaEntregaDotacionMail::class, 1);
    }

    public function test_reconfirmar_la_entrega_no_reenvia_las_actas(): void
    {
        $this->pedidoActivo('TIGO HOME', null, ['email' => 'ana@test.co']);
        $globalId = $this->postJson('/api/pedidos-globales', ['proyecto' => 'TIGO HOME'])->json('global.id');
        $this->putJson("/api/pedidos-globales/$globalId", ['confirmado' => true])->assertOk();
        $this->putJson("/api/pedidos-globales/$globalId", ['entrega_confirmada' => true])->assertOk();

        $this->putJson("/api/pedidos-globales/$globalId", ['entrega_confirmada' => true, 'notas' => 'x'])->assertOk();

        Mail::assertSent(ActaEntregaDotacionMail::class, 1);
    }

    public function test_listado_de_globales(): void
    {
        $this->pedidoActivo('TIGO HOME');
        $globalId = $this->postJson('/api/pedidos-globales', ['proyecto' => 'TIGO HOME'])->json('global.id');

        $this->getJson('/api/pedidos-globales')->assertOk()->assertJsonFragment(['id' => $globalId]);
    }

    // ── Cronograma ───────────────────────────────────────────────────────────

    public function test_cronograma_crea_con_ciclo_de_4_meses_por_defecto(): void
    {
        $proyectoId = DB::table('proyectos')->where('nombre', 'TIGO HOME')->value('id');

        $this->postJson('/api/cronograma-dotacion', ['proyecto_id' => $proyectoId, 'fecha_entrega' => '2026-12-01'])
            ->assertCreated()->assertJsonPath('ciclo_meses', 4)->assertJsonPath('proyecto.nombre', 'TIGO HOME');
    }

    public function test_un_proyecto_solo_tiene_un_cronograma(): void
    {
        $proyectoId = DB::table('proyectos')->where('nombre', 'DIRECTV CO')->value('id');

        $this->postJson('/api/cronograma-dotacion', ['proyecto_id' => $proyectoId, 'fecha_entrega' => '2026-10-01', 'ciclo_meses' => 3])->assertCreated();
        $this->postJson('/api/cronograma-dotacion', ['proyecto_id' => $proyectoId, 'fecha_entrega' => '2027-01-01', 'ciclo_meses' => 6])->assertCreated();

        $this->assertSame(1, DB::table('cronograma_dotacion')->where('proyecto_id', $proyectoId)->count());
        $this->assertSame(6, DB::table('cronograma_dotacion')->where('proyecto_id', $proyectoId)->value('ciclo_meses'));
    }

    public function test_validaciones_del_cronograma(): void
    {
        $proyectoId = DB::table('proyectos')->value('id');

        $this->postJson('/api/cronograma-dotacion', [])->assertStatus(422)->assertJsonValidationErrors(['proyecto_id', 'fecha_entrega']);
        $this->postJson('/api/cronograma-dotacion', ['proyecto_id' => $proyectoId, 'fecha_entrega' => '2026-12-01', 'ciclo_meses' => 25])
            ->assertStatus(422)->assertJsonValidationErrors('ciclo_meses');
        $this->postJson('/api/cronograma-dotacion', ['proyecto_id' => $proyectoId, 'fecha_entrega' => 'no-es-fecha'])
            ->assertStatus(422)->assertJsonValidationErrors('fecha_entrega');
    }

    public function test_activar_desactivar_y_editar_un_cronograma(): void
    {
        $proyectoId = DB::table('proyectos')->where('nombre', 'TIGO EXPRESS')->value('id');
        $id = $this->postJson('/api/cronograma-dotacion', ['proyecto_id' => $proyectoId, 'fecha_entrega' => '2026-12-01'])->json('id');
        $antes = (bool) DB::table('cronograma_dotacion')->where('id', $id)->value('activo');

        $this->patchJson("/api/cronograma-dotacion/$id/toggle")->assertOk()->assertJsonPath('activo', !$antes);
        $this->patchJson("/api/cronograma-dotacion/$id/toggle")->assertOk()->assertJsonPath('activo', $antes);

        $this->putJson("/api/cronograma-dotacion/$id", ['ciclo_meses' => 12])->assertOk()->assertJsonPath('ciclo_meses', 12);
    }

    public function test_los_cronogramas_no_se_eliminan(): void
    {
        $proyectoId = DB::table('proyectos')->where('nombre', 'TIGO EXPRESS')->value('id');
        $id = $this->postJson('/api/cronograma-dotacion', ['proyecto_id' => $proyectoId, 'fecha_entrega' => '2026-12-01'])->json('id');

        $this->deleteJson("/api/cronograma-dotacion/$id")->assertStatus(405);
    }
}
