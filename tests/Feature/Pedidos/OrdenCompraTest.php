<?php

namespace Tests\Feature\Pedidos;

use App\Models\OrdenCompra;
use App\Models\PedidoCompraItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Pedidos y Compras > Compras > Ver y Crear Orden de Compra.
 */
class OrdenCompraTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private int $sede;
    private int $proveedor;
    private string $categoria = 'Herramientas';

    protected function setUp(): void
    {
        parent::setUp();
        $this->actuarComo('general', ['name' => 'Comprador']);
        $this->sede = $this->sede('SEDE COMPRAS');
        $this->proveedor = DB::table('proveedores')->insertGetId([
            'nit' => (string) random_int(100000000, 999999999), 'naturaleza' => 'JURIDICA',
            'nombre' => 'PROVEEDOR PRUEBA SAS', 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    /** Crea un ítem de pedido ya marcado "Enviado a Compras" y devuelve su id. */
    private function itemParaComprar(int $cantidad = 3, ?string $categoria = null): int
    {
        $tipo = $this->tipoProducto(null, $categoria ?? $this->categoria);
        $pedido = $this->postJson('/api/pedidos-compra', [
            'tipo_responsable' => 'Empleado', 'responsable' => 'Alguien', 'sede' => 'SEDE COMPRAS',
            'clase' => 'X', 'concepto' => 'Y', 'items' => [['tipo_producto_id' => $tipo, 'cantidad' => $cantidad]],
        ])->json();
        $itemId = $pedido['items'][0]['id'];
        $this->postJson("/api/pedido-compra-items/$itemId/enviar-compras")->assertOk();

        return $itemId;
    }

    private function crearOrden(array $items, array $extra = [])
    {
        return $this->postJson('/api/ordenes-compra', array_merge([
            'sede_id' => $this->sede, 'proveedor_id' => $this->proveedor, 'items' => $items,
        ], $extra));
    }

    public function test_pendientes_por_categoria_cuenta_solo_items_enviados_a_compras_sin_orden(): void
    {
        $this->itemParaComprar(1, 'Herramientas');
        $this->itemParaComprar(1, 'Herramientas');
        $this->itemParaComprar(1, 'EPP');

        // Un item que NO se envió a compras no debe contar
        $tipo = $this->tipoProducto(null, 'Herramientas');
        $this->postJson('/api/pedidos-compra', [
            'tipo_responsable' => 'Empleado', 'responsable' => 'A', 'sede' => 'SEDE COMPRAS', 'clase' => 'X', 'concepto' => 'Y',
            'items' => [['tipo_producto_id' => $tipo, 'cantidad' => 1]],
        ])->assertCreated();

        $r = collect($this->getJson('/api/ordenes-compra-pendientes-categoria')->assertOk()->json())->keyBy('categoria');

        $this->assertSame(2, $r['Herramientas']['cantidad_items']);
        $this->assertSame(1, $r['EPP']['cantidad_items']);
    }

    public function test_items_pendientes_se_filtran_por_categoria(): void
    {
        $herr = $this->itemParaComprar(2, 'Herramientas');
        $epp = $this->itemParaComprar(2, 'EPP');

        $ids = collect($this->getJson('/api/ordenes-compra-items-pendientes?categoria=EPP')->json())->pluck('id');

        $this->assertTrue($ids->contains($epp));
        $this->assertFalse($ids->contains($herr));
    }

    public function test_crear_orden_calcula_subtotal_iva_transporte_y_total(): void
    {
        $item = $this->itemParaComprar(3);

        $r = $this->crearOrden(
            [['pedido_compra_item_id' => $item, 'precio_unitario' => 1000, 'iva_porcentaje' => 19]],
            ['valor_transporte' => 500]
        )->assertCreated();

        // 3 x 1000 = 3000; IVA 19% = 570; + transporte 500 = 4070
        $r->assertJsonPath('subtotal', 3000)->assertJsonPath('iva_total', 570)
            ->assertJsonPath('valor_transporte', 500)->assertJsonPath('valor_total', 4070)
            ->assertJsonPath('estado', 'Creada')->assertJsonPath('creado_por', 'Comprador')
            ->assertJsonPath('naturaleza', 'JURIDICA');
        $this->assertMatchesRegularExpression('/^OC-\d{3,}$/', $r->json('codigo'));
    }

    public function test_el_iva_se_redondea_al_peso(): void
    {
        $item = $this->itemParaComprar(1);

        // 1 x 333 = 333 ; 19% = 63.27 -> 63
        $this->crearOrden([['pedido_compra_item_id' => $item, 'precio_unitario' => 333, 'iva_porcentaje' => 19]])
            ->assertCreated()->assertJsonPath('iva_total', 63)->assertJsonPath('valor_total', 396);
    }

    public function test_una_orden_puede_consolidar_varios_productos(): void
    {
        $a = $this->itemParaComprar(2);
        $b = $this->itemParaComprar(4);

        $this->crearOrden([
            ['pedido_compra_item_id' => $a, 'precio_unitario' => 100, 'iva_porcentaje' => 0],
            ['pedido_compra_item_id' => $b, 'precio_unitario' => 200, 'iva_porcentaje' => 0],
        ])->assertCreated()->assertJsonCount(2, 'items')->assertJsonPath('valor_total', 1000);
    }

    public function test_los_items_de_una_orden_dejan_de_estar_pendientes(): void
    {
        $item = $this->itemParaComprar();
        $orden = $this->crearOrden([['pedido_compra_item_id' => $item, 'precio_unitario' => 1, 'iva_porcentaje' => 0]])->json();

        $this->assertSame($orden['id'], PedidoCompraItem::find($item)->orden_compra_id);
        $ids = collect($this->getJson('/api/ordenes-compra-items-pendientes')->json())->pluck('id');
        $this->assertFalse($ids->contains($item));
    }

    public function test_un_item_no_puede_estar_en_dos_ordenes(): void
    {
        $item = $this->itemParaComprar();
        $fila = [['pedido_compra_item_id' => $item, 'precio_unitario' => 1, 'iva_porcentaje' => 0]];

        $this->crearOrden($fila)->assertCreated();
        $this->crearOrden($fila)->assertStatus(422);

        $this->assertSame(1, OrdenCompra::count());
    }

    public function test_no_se_puede_comprar_un_item_que_no_fue_enviado_a_compras(): void
    {
        $tipo = $this->tipoProducto();
        $pedido = $this->postJson('/api/pedidos-compra', [
            'tipo_responsable' => 'Empleado', 'responsable' => 'A', 'sede' => 'SEDE COMPRAS', 'clase' => 'X', 'concepto' => 'Y',
            'items' => [['tipo_producto_id' => $tipo, 'cantidad' => 1]],
        ])->json();

        $this->crearOrden([['pedido_compra_item_id' => $pedido['items'][0]['id'], 'precio_unitario' => 1, 'iva_porcentaje' => 0]])
            ->assertStatus(422);
    }

    public function test_una_orden_con_un_item_invalido_no_guarda_nada(): void
    {
        $bueno = $this->itemParaComprar();

        $this->crearOrden([
            ['pedido_compra_item_id' => $bueno, 'precio_unitario' => 1, 'iva_porcentaje' => 0],
            ['pedido_compra_item_id' => 999999, 'precio_unitario' => 1, 'iva_porcentaje' => 0],
        ])->assertStatus(422);

        $this->assertSame(0, OrdenCompra::count());
        $this->assertNull(PedidoCompraItem::find($bueno)->orden_compra_id);
    }

    public function test_validaciones_de_la_orden(): void
    {
        $item = $this->itemParaComprar();

        $this->postJson('/api/ordenes-compra', [])->assertStatus(422)->assertJsonValidationErrors(['sede_id', 'proveedor_id', 'items']);
        $this->crearOrden([['pedido_compra_item_id' => $item, 'precio_unitario' => -5, 'iva_porcentaje' => 19]])
            ->assertStatus(422)->assertJsonValidationErrors('items.0.precio_unitario');
        $this->crearOrden([['pedido_compra_item_id' => $item, 'precio_unitario' => 5, 'iva_porcentaje' => 150]])
            ->assertStatus(422)->assertJsonValidationErrors('items.0.iva_porcentaje');
    }

    public function test_eliminar_una_orden_libera_sus_items(): void
    {
        $item = $this->itemParaComprar();
        $orden = $this->crearOrden([['pedido_compra_item_id' => $item, 'precio_unitario' => 1, 'iva_porcentaje' => 0]])->json();

        $this->deleteJson("/api/ordenes-compra/{$orden['id']}")->assertNoContent();

        $this->assertNull(PedidoCompraItem::find($item)->orden_compra_id);
        $ids = collect($this->getJson('/api/ordenes-compra-items-pendientes')->json())->pluck('id');
        $this->assertTrue($ids->contains($item), 'El item debe volver al panel de pendientes.');
    }

    public function test_listar_y_ver_ordenes(): void
    {
        $item = $this->itemParaComprar();
        $id = $this->crearOrden([['pedido_compra_item_id' => $item, 'precio_unitario' => 10, 'iva_porcentaje' => 0]])->json('id');

        $this->getJson('/api/ordenes-compra')->assertOk()->assertJsonFragment(['id' => $id]);
        $this->getJson("/api/ordenes-compra/$id")->assertOk()->assertJsonPath('proveedor.nombre', 'PROVEEDOR PRUEBA SAS');
    }

    public function test_el_pdf_de_la_orden_se_genera(): void
    {
        $item = $this->itemParaComprar();
        $id = $this->crearOrden([['pedido_compra_item_id' => $item, 'precio_unitario' => 10000, 'iva_porcentaje' => 19]])->json('id');

        $r = $this->get("/api/ordenes-compra/$id/pdf")->assertOk();

        $this->assertStringContainsString('application/pdf', $r->headers->get('Content-Type'));
        $this->assertStringStartsWith("%PDF", $r->getContent());
    }
}
