<?php

namespace Tests\Feature\Dotacion;

use App\Models\InventarioDotacion;
use App\Models\PedidoAutomatico;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Inventarios > Dotación > Pedidos automáticos: el pedido descuenta inventario al quedar
 * Activo y lo restituye al cancelarse / borrarse / devolverse.
 */
class PedidosAutomaticosTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private User $empleado;
    private InventarioDotacion $camisa;
    private InventarioDotacion $pantalon;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::store('file')->forget('inventario-dotacion:flat');
        $this->actuarComo('consultor');
        $this->empleado = $this->usuario('consultor', ['nombres' => 'Ana', 'apellidos' => 'Pérez', 'cedula' => '1001']);

        $this->camisa = $this->prenda('CAMISA', 'M', 10);
        $this->pantalon = $this->prenda('PANTALON', '32', 5);
    }

    private function prenda(string $prenda, string $talla, int $cantidad): InventarioDotacion
    {
        return InventarioDotacion::create([
            'proyecto' => 'SYM TIGO HOME', 'prenda' => $prenda, 'genero' => 'Masculino', 'talla' => $talla,
            'precio' => 1000, 'cantidad' => $cantidad, 'stock_minimo' => 0,
        ]);
    }

    private function crear(array $extra = [])
    {
        return $this->postJson('/api/pedidos-automaticos', array_merge([
            'empleado_id' => $this->empleado->id,
            'items' => [
                ['inventario_dotacion_id' => $this->camisa->id, 'cantidad' => 2],
                ['inventario_dotacion_id' => $this->pantalon->id, 'cantidad' => 1],
            ],
        ], $extra));
    }

    public function test_pedido_activo_descuenta_el_inventario_y_genera_codigo(): void
    {
        $r = $this->crear()->assertCreated();

        $this->assertMatchesRegularExpression('/^\d{5}$/', $r->json('codigo'));
        $r->assertJsonPath('estado', 'Activo')->assertJsonCount(2, 'items');
        $this->assertSame(8, $this->camisa->fresh()->cantidad);
        $this->assertSame(4, $this->pantalon->fresh()->cantidad);
    }

    public function test_los_codigos_son_consecutivos(): void
    {
        $a = $this->crear(['items' => []])->json('codigo');
        $b = $this->crear(['items' => []])->json('codigo');

        $this->assertSame((int) $a + 1, (int) $b);
    }

    public function test_stock_insuficiente_rechaza_el_pedido_completo_sin_descontar_nada(): void
    {
        $antes = PedidoAutomatico::count();

        $this->crear(['items' => [
            ['inventario_dotacion_id' => $this->camisa->id, 'cantidad' => 2],
            ['inventario_dotacion_id' => $this->pantalon->id, 'cantidad' => 99],
        ]])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Stock insuficiente'));

        $this->assertSame($antes, PedidoAutomatico::count());
        $this->assertSame(10, $this->camisa->fresh()->cantidad, 'La primera línea no debe quedar descontada.');
        $this->assertSame(5, $this->pantalon->fresh()->cantidad);
    }

    public function test_pedido_pendiente_no_toca_el_inventario_hasta_activarse(): void
    {
        $id = $this->crear(['estado' => 'Pendiente'])->assertCreated()->json('id');
        $this->assertSame(10, $this->camisa->fresh()->cantidad);

        $this->putJson("/api/pedidos-automaticos/$id", [
            'empleado_id' => $this->empleado->id, 'estado' => 'Activo',
            'items' => [['inventario_dotacion_id' => $this->camisa->id, 'cantidad' => 3]],
        ])->assertOk();

        $this->assertSame(7, $this->camisa->fresh()->cantidad);
    }

    public function test_cancelar_un_pedido_activo_restituye_el_inventario(): void
    {
        $id = $this->crear()->json('id');

        $this->putJson("/api/pedidos-automaticos/$id", ['empleado_id' => $this->empleado->id, 'estado' => 'Cancelado'])->assertOk();

        $this->assertSame(10, $this->camisa->fresh()->cantidad);
        $this->assertSame(5, $this->pantalon->fresh()->cantidad);
        $this->assertDatabaseCount('pedido_automatico_items', 0);
    }

    public function test_editar_los_items_de_un_pedido_activo_recalcula_el_inventario(): void
    {
        $id = $this->crear()->json('id'); // camisa -2, pantalón -1

        $this->putJson("/api/pedidos-automaticos/$id", [
            'empleado_id' => $this->empleado->id, 'estado' => 'Activo',
            'items' => [['inventario_dotacion_id' => $this->camisa->id, 'cantidad' => 5]],
        ])->assertOk();

        $this->assertSame(5, $this->camisa->fresh()->cantidad);
        $this->assertSame(5, $this->pantalon->fresh()->cantidad, 'El pantalón se libera al quitarlo del pedido.');
    }

    public function test_editar_con_stock_insuficiente_no_deja_el_inventario_inconsistente(): void
    {
        $id = $this->crear()->json('id');

        $this->putJson("/api/pedidos-automaticos/$id", [
            'empleado_id' => $this->empleado->id, 'estado' => 'Activo',
            'items' => [['inventario_dotacion_id' => $this->camisa->id, 'cantidad' => 500]],
        ])->assertStatus(422);

        // La transacción se revierte: queda como antes de editar (camisa -2, pantalón -1).
        $this->assertSame(8, $this->camisa->fresh()->cantidad);
        $this->assertSame(4, $this->pantalon->fresh()->cantidad);
    }

    public function test_eliminar_un_pedido_activo_restituye_pero_uno_pendiente_no_toca_nada(): void
    {
        $activo = $this->crear()->json('id');
        $this->deleteJson("/api/pedidos-automaticos/$activo")->assertNoContent();
        $this->assertSame(10, $this->camisa->fresh()->cantidad);

        $pendiente = $this->crear(['estado' => 'Pendiente'])->json('id');
        $this->deleteJson("/api/pedidos-automaticos/$pendiente")->assertNoContent();
        $this->assertSame(10, $this->camisa->fresh()->cantidad, 'Un pendiente nunca descontó, no debe sumar.');
    }

    public function test_devolver_solo_aplica_a_pedidos_completados_y_restituye_una_sola_vez(): void
    {
        $id = $this->crear()->json('id');

        $this->postJson("/api/pedidos-automaticos/$id/devolver")->assertStatus(422); // sigue Activo

        PedidoAutomatico::whereKey($id)->update(['estado' => 'Completado']);
        $this->postJson("/api/pedidos-automaticos/$id/devolver")->assertOk()->assertJsonPath('estado', 'Devolución');
        $this->assertSame(10, $this->camisa->fresh()->cantidad);

        $this->postJson("/api/pedidos-automaticos/$id/devolver")->assertStatus(422);
        $this->assertSame(10, $this->camisa->fresh()->cantidad, 'No debe restituir dos veces.');
    }

    public function test_bulk_estado_valida_el_estado_y_restituye_al_pasar_a_devolucion(): void
    {
        $id = $this->crear()->json('id');

        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$id], 'estado' => 'Inventado'])
            ->assertStatus(422)->assertJsonValidationErrors('estado');
        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [], 'estado' => 'Activo'])->assertStatus(422);

        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$id], 'estado' => 'Devolución'])->assertOk();
        $this->assertSame(10, $this->camisa->fresh()->cantidad);
        $this->assertDatabaseHas('pedidos_automaticos', ['id' => $id, 'estado' => 'Devolución']);
    }

    public function test_validaciones_del_alta(): void
    {
        $this->postJson('/api/pedidos-automaticos', [])->assertStatus(422)->assertJsonValidationErrors('empleado_id');
        $this->crear(['items' => [['inventario_dotacion_id' => $this->camisa->id, 'cantidad' => 0]]])
            ->assertStatus(422)->assertJsonValidationErrors('items.0.cantidad');
        $this->crear(['items' => [['inventario_dotacion_id' => 999999, 'cantidad' => 1]]])
            ->assertStatus(422)->assertJsonValidationErrors('items.0.inventario_dotacion_id');
    }

    public function test_listado_filtra_por_estado_y_busca_por_empleado(): void
    {
        $activo = $this->crear()->json('id');
        $pend = $this->crear(['estado' => 'Pendiente'])->json('id');

        $porEstado = collect($this->getJson('/api/pedidos-automaticos?estado=Pendiente')->json())->pluck('id');
        $this->assertTrue($porEstado->contains($pend));
        $this->assertFalse($porEstado->contains($activo));

        $porCedula = collect($this->getJson('/api/pedidos-automaticos?search=1001')->json())->pluck('id');
        $this->assertTrue($porCedula->contains($activo));
    }

    public function test_ultimo_pedido_del_empleado_sirve_de_referencia(): void
    {
        $this->getJson("/api/pedidos-automaticos/ultimo-empleado/{$this->empleado->id}")->assertOk()->assertJson([]);

        $this->crear()->assertCreated();
        $this->getJson("/api/pedidos-automaticos/ultimo-empleado/{$this->empleado->id}")
            ->assertOk()->assertJsonCount(2, 'items');
    }
}
