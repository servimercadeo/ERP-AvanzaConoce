<?php

namespace Tests\Feature\Pedidos;

use App\Models\PedidoCompra;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Pedidos y Compras > Pedidos > Ver y Crear Pedidos (alta, edición, código, envío a compras).
 */
class PedidoCompraTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private int $sede;
    private int $tipo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actuarComo('general');
        $this->sede = $this->sede('SEDE PEDIDOS');
        $this->tipo = $this->tipoProducto('SILLA ERGONOMICA', 'Equipos');
    }

    private function payload(array $extra = []): array
    {
        return array_merge([
            'tipo_responsable' => 'Empleado',
            'responsable'      => 'Laura Gómez',
            'sede'             => 'SEDE PEDIDOS',
            'clase'            => 'Insumos',
            'concepto'         => 'Reposición',
            'items'            => [['tipo_producto_id' => $this->tipo, 'cantidad' => 2]],
        ], $extra);
    }

    public function test_crear_pedido_genera_codigo_estado_inicial_y_resuelve_la_sede(): void
    {
        $r = $this->postJson('/api/pedidos-compra', $this->payload())->assertCreated();

        $this->assertMatchesRegularExpression('/^PED-\d{3,}$/', $r->json('codigo'));
        $r->assertJsonPath('estado', 'Pendiente Aprobación')
            ->assertJsonPath('sede_id', $this->sede)
            ->assertJsonCount(1, 'items');
        $this->assertNotNull($r->json('registra'));
    }

    public function test_el_nombre_del_producto_se_toma_del_catalogo_no_del_cliente(): void
    {
        $r = $this->postJson('/api/pedidos-compra', $this->payload([
            'items' => [['tipo_producto_id' => $this->tipo, 'cantidad' => 1, 'producto' => 'NOMBRE FALSO']],
        ]))->assertCreated();

        $this->assertSame('SILLA ERGONOMICA', $r->json('items.0.producto'));
    }

    public function test_los_codigos_son_consecutivos(): void
    {
        $a = $this->postJson('/api/pedidos-compra', $this->payload())->json('codigo');
        $b = $this->postJson('/api/pedidos-compra', $this->payload())->json('codigo');

        $this->assertSame((int) substr($a, 4) + 1, (int) substr($b, 4));
    }

    public function test_un_codigo_no_se_reutiliza_al_borrar_el_ultimo_pedido_intermedio(): void
    {
        $a = $this->postJson('/api/pedidos-compra', $this->payload())->json();
        $b = $this->postJson('/api/pedidos-compra', $this->payload())->json();
        $this->deleteJson("/api/pedidos-compra/{$a['id']}")->assertNoContent();

        $c = $this->postJson('/api/pedidos-compra', $this->payload())->json('codigo');

        $this->assertNotSame($b['codigo'], $c);
        $this->assertSame((int) substr($b['codigo'], 4) + 1, (int) substr($c, 4));
    }

    public function test_validaciones_del_alta(): void
    {
        $this->postJson('/api/pedidos-compra', [])->assertStatus(422)
            ->assertJsonValidationErrors(['tipo_responsable', 'responsable', 'sede', 'clase', 'concepto', 'items']);

        $this->postJson('/api/pedidos-compra', $this->payload(['tipo_responsable' => 'Robot']))
            ->assertStatus(422)->assertJsonValidationErrors('tipo_responsable');
        $this->postJson('/api/pedidos-compra', $this->payload(['items' => []]))
            ->assertStatus(422)->assertJsonValidationErrors('items');
        $this->postJson('/api/pedidos-compra', $this->payload(['items' => [['tipo_producto_id' => $this->tipo, 'cantidad' => 0]]]))
            ->assertStatus(422)->assertJsonValidationErrors('items.0.cantidad');
        $this->postJson('/api/pedidos-compra', $this->payload(['items' => [['tipo_producto_id' => 999999, 'cantidad' => 1]]]))
            ->assertStatus(422)->assertJsonValidationErrors('items.0.tipo_producto_id');
    }

    public function test_un_alta_invalida_no_deja_pedidos_a_medias(): void
    {
        $antes = PedidoCompra::count();
        $this->postJson('/api/pedidos-compra', $this->payload(['items' => [['tipo_producto_id' => 999999, 'cantidad' => 1]]]))
            ->assertStatus(422);

        $this->assertSame($antes, PedidoCompra::count());
    }

    public function test_listar_y_ver_un_pedido(): void
    {
        $id = $this->postJson('/api/pedidos-compra', $this->payload())->json('id');

        $this->getJson('/api/pedidos-compra')->assertOk()->assertJsonFragment(['id' => $id]);
        $this->getJson("/api/pedidos-compra/$id")->assertOk()->assertJsonPath('responsable', 'Laura Gómez');
    }

    public function test_editar_items_reemplaza_los_anteriores(): void
    {
        $otro = $this->tipoProducto('MESA REUNIONES', 'Equipos');
        $id = $this->postJson('/api/pedidos-compra', $this->payload())->json('id');

        $r = $this->putJson("/api/pedidos-compra/$id", ['items' => [['tipo_producto_id' => $otro, 'cantidad' => 5]]])->assertOk();

        $r->assertJsonCount(1, 'items')->assertJsonPath('items.0.producto', 'MESA REUNIONES')->assertJsonPath('items.0.cantidad', 5);
        $this->assertDatabaseMissing('pedido_compra_items', ['pedido_compra_id' => $id, 'producto' => 'SILLA ERGONOMICA']);
    }

    public function test_actualizacion_parcial_no_toca_los_items(): void
    {
        $id = $this->postJson('/api/pedidos-compra', $this->payload())->json('id');

        $this->putJson("/api/pedidos-compra/$id", ['concepto' => 'Nuevo concepto'])->assertOk()->assertJsonCount(1, 'items');
    }

    public function test_no_se_puede_marcar_enviado_a_compras_sin_haber_revisado_el_stock(): void
    {
        $id = $this->postJson('/api/pedidos-compra', $this->payload())->json('id');

        $this->putJson("/api/pedidos-compra/$id", ['estado' => 'Enviado a compras', 'estado_compra' => 'Pendiente'])
            ->assertStatus(422);

        $this->assertDatabaseHas('pedidos_compra', ['id' => $id, 'estado' => 'Pendiente Aprobación']);
    }

    public function test_enviado_a_compras_se_permite_cuando_un_item_ya_esta_marcado_para_comprar(): void
    {
        $id = $this->postJson('/api/pedidos-compra', $this->payload())->json('id');
        $itemId = $this->getJson("/api/pedidos-compra/$id")->json('items.0.id');
        $this->postJson("/api/pedido-compra-items/$itemId/enviar-compras")->assertOk();

        $this->putJson("/api/pedidos-compra/$id", ['estado' => 'Enviado a compras', 'estado_compra' => 'Pendiente'])
            ->assertOk()->assertJsonPath('estado', 'Enviado a compras');
    }

    public function test_eliminar_un_pedido(): void
    {
        $id = $this->postJson('/api/pedidos-compra', $this->payload())->json('id');

        $this->deleteJson("/api/pedidos-compra/$id")->assertNoContent();
        $this->assertDatabaseMissing('pedidos_compra', ['id' => $id]);
        $this->assertDatabaseMissing('pedido_compra_items', ['pedido_compra_id' => $id]);
    }
}
