<?php

namespace Tests\Feature\Pedidos;

use App\Mail\ActaEntregaPedidoMail;
use App\Mail\ActaTrasladoPedidoMail;
use App\Models\InventarioProducto;
use App\Models\PedidoCompraItem;
use App\Models\TrasladoProducto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Revisión manual de stock de un pedido: aprobar por stock local, pedir traslado desde otra
 * sede (con aprobación posterior en Inventario General), enviar a compras, deshacer, y la
 * asignación del pedido (que dispara el acta de entrega).
 */
class RevisionStockYTrasladosTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private int $sedePedida;
    private int $sedeOrigen;
    private int $tipo;
    private int $pedidoId;
    private int $itemId;
    private User $responsable;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->actuarComo('general', ['name' => 'Quien Aprueba']);

        $this->sedePedida = $this->sede('SEDE PEDIDA');
        $this->sedeOrigen = $this->sede('SEDE ORIGEN');
        $this->tipo = $this->tipoProducto('LAPTOP', 'Equipos');
        $this->responsable = $this->usuario('general', ['name' => 'Responsable Pedido', 'email' => 'responsable@test.co']);

        $this->crearPedido(3);
    }

    private function crearPedido(int $cantidad): void
    {
        $pedido = $this->postJson('/api/pedidos-compra', [
            'tipo_responsable' => 'Empleado',
            'responsable'      => 'Responsable Pedido',
            'sede'             => 'SEDE PEDIDA',
            'clase'            => 'Equipos',
            'concepto'         => 'Compra',
            'items'            => [['tipo_producto_id' => $this->tipo, 'cantidad' => $cantidad]],
        ])->assertCreated()->json();

        $this->pedidoId = $pedido['id'];
        $this->itemId = $pedido['items'][0]['id'];
    }

    private function cantidad(int $sedeId): int
    {
        return (int) InventarioProducto::where('tipo_producto_id', $this->tipo)->where('sede_id', $sedeId)->value('cantidad');
    }

    private function estadoItem(): ?string
    {
        return PedidoCompraItem::find($this->itemId)->estado_revision;
    }

    // ── Consulta de stock ────────────────────────────────────────────────────

    public function test_stock_revision_muestra_la_sede_pedida_y_las_demas_sedes(): void
    {
        $this->inventario($this->tipo, $this->sedePedida, 1, ['P-1']);
        $this->inventario($this->tipo, $this->sedeOrigen, 9);

        $r = $this->getJson("/api/pedidos-compra/{$this->pedidoId}/stock-revision")->assertOk();

        $r->assertJsonPath('0.sede_pedido.nombre', 'SEDE PEDIDA')
            ->assertJsonPath('0.sede_pedido.cantidad', 1)
            ->assertJsonPath('0.sede_pedido.series', ['P-1']);

        $origen = collect($r->json('0.sedes_disponibles'))->firstWhere('sede_id', $this->sedeOrigen);
        $this->assertSame(9, $origen['cantidad']);
        $this->assertFalse(collect($r->json('0.sedes_disponibles'))->contains('sede_id', $this->sedePedida));
    }

    // ── Aprobar por stock local ──────────────────────────────────────────────

    public function test_aprobar_por_stock_descuenta_la_sede_pedida(): void
    {
        $this->inventario($this->tipo, $this->sedePedida, 5);

        $this->postJson("/api/pedido-compra-items/{$this->itemId}/stock-local", ['observacion' => 'Hay en bodega'])->assertOk();

        $this->assertSame(2, $this->cantidad($this->sedePedida));
        $this->assertSame('Aprobado por Stock', $this->estadoItem());
    }

    public function test_aprobar_por_stock_falla_si_no_alcanza_y_no_toca_nada(): void
    {
        $this->inventario($this->tipo, $this->sedePedida, 2); // se piden 3

        $this->postJson("/api/pedido-compra-items/{$this->itemId}/stock-local", ['observacion' => 'x'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Solo hay 2'));

        $this->assertSame(2, $this->cantidad($this->sedePedida));
        $this->assertNull($this->estadoItem());
    }

    public function test_aprobar_por_stock_sin_ninguna_fila_de_inventario_falla(): void
    {
        $this->postJson("/api/pedido-compra-items/{$this->itemId}/stock-local", ['observacion' => 'x'])->assertStatus(422);
    }

    public function test_la_observacion_es_obligatoria_al_aprobar_por_stock(): void
    {
        $this->inventario($this->tipo, $this->sedePedida, 5);

        $this->postJson("/api/pedido-compra-items/{$this->itemId}/stock-local", [])
            ->assertStatus(422)->assertJsonValidationErrors('observacion');
    }

    public function test_producto_serializado_exige_elegir_los_seriales_exactos(): void
    {
        $inv = $this->inventario($this->tipo, $this->sedePedida, 4, ['S1', 'S2', 'S3', 'S4']);
        $url = "/api/pedido-compra-items/{$this->itemId}/stock-local";

        // se piden 3: elegir menos, o uno que no existe, se rechaza
        $this->postJson($url, ['observacion' => 'x', 'seriales' => ['S1']])->assertStatus(422);
        $this->postJson($url, ['observacion' => 'x', 'seriales' => ['S1', 'S2', 'NOEXISTE']])->assertStatus(422);
        $this->assertSame(4, $this->cantidad($this->sedePedida));

        $this->postJson($url, ['observacion' => 'x', 'seriales' => ['S1', 'S2', 'S3']])->assertOk();

        $this->assertSame(1, $this->cantidad($this->sedePedida));
        $this->assertSame(['S4'], $inv->series()->pluck('serial')->all());
        $this->assertSame('S1, S2, S3', PedidoCompraItem::find($this->itemId)->seriales);
    }

    // ── Enviar a compras ─────────────────────────────────────────────────────

    public function test_enviar_a_compras_marca_el_item(): void
    {
        $this->postJson("/api/pedido-compra-items/{$this->itemId}/enviar-compras")->assertOk();

        $this->assertSame('Enviado a Compras', $this->estadoItem());
    }

    // ── Solicitar traslado ───────────────────────────────────────────────────

    public function test_solicitar_traslado_solo_registra_la_solicitud_sin_mover_stock(): void
    {
        $origen = $this->inventario($this->tipo, $this->sedeOrigen, 10);

        $this->postJson("/api/pedido-compra-items/{$this->itemId}/traslado", [
            'inventario_producto_origen_id' => $origen->id, 'cantidad' => 3,
        ])->assertOk();

        $this->assertSame(10, $this->cantidad($this->sedeOrigen), 'El stock no debe moverse hasta aprobar.');
        $this->assertSame('Traslado Solicitado', $this->estadoItem());
        $this->assertDatabaseHas('traslados_producto', [
            'pedido_compra_item_id' => $this->itemId, 'estado' => 'Pendiente Aprobación',
            'sede_destino_id' => $this->sedePedida, 'cantidad' => 3, 'solicitado_por' => 'Quien Aprueba',
        ]);
    }

    public function test_solicitar_traslado_valida_origen_y_cantidad(): void
    {
        $origen = $this->inventario($this->tipo, $this->sedeOrigen, 2);
        $propia = $this->inventario($this->tipo, $this->sedePedida, 8);
        $url = "/api/pedido-compra-items/{$this->itemId}/traslado";

        $this->postJson($url, ['inventario_producto_origen_id' => $propia->id, 'cantidad' => 1])->assertStatus(422); // misma sede
        $this->postJson($url, ['inventario_producto_origen_id' => $origen->id, 'cantidad' => 5])->assertStatus(422);  // no alcanza
        $this->postJson($url, ['inventario_producto_origen_id' => $origen->id, 'cantidad' => 0])->assertStatus(422);
        $this->postJson($url, ['inventario_producto_origen_id' => 999999, 'cantidad' => 1])->assertStatus(422);

        $this->assertSame(0, TrasladoProducto::count());
    }

    // ── Aprobar / rechazar traslado (Inventario General > Aprobación de Traslado) ──

    private function solicitarTraslado(InventarioProducto $origen, int $cantidad = 3): TrasladoProducto
    {
        $this->postJson("/api/pedido-compra-items/{$this->itemId}/traslado", [
            'inventario_producto_origen_id' => $origen->id, 'cantidad' => $cantidad,
        ])->assertOk();

        return TrasladoProducto::where('pedido_compra_item_id', $this->itemId)->latest('id')->first();
    }

    public function test_listar_traslados_filtra_por_estado(): void
    {
        $t = $this->solicitarTraslado($this->inventario($this->tipo, $this->sedeOrigen, 10));

        $this->getJson('/api/traslados-producto?estado=Pendiente Aprobación')->assertOk()->assertJsonFragment(['id' => $t->id]);
        $this->getJson('/api/traslados-producto?estado=Completado')->assertOk()->assertJsonMissing(['id' => $t->id]);
    }

    public function test_aprobar_traslado_mueve_el_stock_crea_el_destino_y_envia_el_acta(): void
    {
        $t = $this->solicitarTraslado($this->inventario($this->tipo, $this->sedeOrigen, 10));

        $this->postJson("/api/traslados-producto/{$t->id}/aprobar")->assertOk()->assertJsonPath('acta.enviada', true);

        $this->assertSame(7, $this->cantidad($this->sedeOrigen));
        $this->assertSame(3, $this->cantidad($this->sedePedida), 'Debe crearse la fila del destino si no existía.');
        $this->assertSame('Traslado Aprobado', $this->estadoItem());
        $this->assertDatabaseHas('traslados_producto', ['id' => $t->id, 'estado' => 'Completado', 'aprobado_por' => 'Quien Aprueba']);

        Mail::assertSent(ActaTrasladoPedidoMail::class, fn ($m) => $m->hasTo('responsable@test.co'));
    }

    public function test_aprobar_traslado_suma_al_destino_existente(): void
    {
        $this->inventario($this->tipo, $this->sedePedida, 2);
        $t = $this->solicitarTraslado($this->inventario($this->tipo, $this->sedeOrigen, 10));

        $this->postJson("/api/traslados-producto/{$t->id}/aprobar")->assertOk();

        $this->assertSame(5, $this->cantidad($this->sedePedida));
    }

    public function test_un_traslado_no_se_puede_aprobar_dos_veces(): void
    {
        $t = $this->solicitarTraslado($this->inventario($this->tipo, $this->sedeOrigen, 10));

        $this->postJson("/api/traslados-producto/{$t->id}/aprobar")->assertOk();
        $this->postJson("/api/traslados-producto/{$t->id}/aprobar")->assertStatus(422);
        $this->postJson("/api/traslados-producto/{$t->id}/rechazar")->assertStatus(422);

        $this->assertSame(7, $this->cantidad($this->sedeOrigen), 'El segundo intento no debe descontar otra vez.');
    }

    public function test_aprobar_falla_si_el_origen_ya_no_tiene_stock_suficiente(): void
    {
        $origen = $this->inventario($this->tipo, $this->sedeOrigen, 10);
        $t = $this->solicitarTraslado($origen);
        $origen->update(['cantidad' => 1]); // alguien más lo consumió

        $this->postJson("/api/traslados-producto/{$t->id}/aprobar")->assertStatus(422);

        $this->assertSame(1, $this->cantidad($this->sedeOrigen));
        $this->assertDatabaseHas('traslados_producto', ['id' => $t->id, 'estado' => 'Pendiente Aprobación']);
    }

    public function test_traslado_de_producto_serializado_mueve_los_seriales_elegidos(): void
    {
        $origen = $this->inventario($this->tipo, $this->sedeOrigen, 4, ['A', 'B', 'C', 'D']);
        $t = $this->solicitarTraslado($origen, 2);

        $this->postJson("/api/traslados-producto/{$t->id}/aprobar", ['seriales' => ['A']])->assertStatus(422);
        $this->postJson("/api/traslados-producto/{$t->id}/aprobar", ['seriales' => ['A', 'ZZZ']])->assertStatus(422);

        $this->postJson("/api/traslados-producto/{$t->id}/aprobar", ['seriales' => ['A', 'B']])->assertOk();

        $this->assertEqualsCanonicalizing(['C', 'D'], $origen->series()->pluck('serial')->all());
        $destino = InventarioProducto::where('tipo_producto_id', $this->tipo)->where('sede_id', $this->sedePedida)->first();
        $this->assertEqualsCanonicalizing(['A', 'B'], $destino->series()->pluck('serial')->all());
    }

    public function test_rechazar_traslado_libera_el_item_y_no_mueve_stock(): void
    {
        $t = $this->solicitarTraslado($this->inventario($this->tipo, $this->sedeOrigen, 10));

        $this->postJson("/api/traslados-producto/{$t->id}/rechazar", ['motivo' => 'No hay transporte'])->assertOk();

        $this->assertSame(10, $this->cantidad($this->sedeOrigen));
        $this->assertNull($this->estadoItem());
        $this->assertDatabaseHas('pedido_compra_items', ['id' => $this->itemId, 'observacion' => 'No hay transporte']);
        $this->assertDatabaseHas('traslados_producto', ['id' => $t->id, 'estado' => 'Rechazado']);
    }

    // ── Deshacer revisión ────────────────────────────────────────────────────

    public function test_deshacer_aprobacion_por_stock_devuelve_cantidad_y_seriales(): void
    {
        $inv = $this->inventario($this->tipo, $this->sedePedida, 3, ['S1', 'S2', 'S3']);
        $this->postJson("/api/pedido-compra-items/{$this->itemId}/stock-local", ['observacion' => 'x', 'seriales' => ['S1', 'S2', 'S3']])->assertOk();
        $this->assertSame(0, $this->cantidad($this->sedePedida));

        $this->postJson("/api/pedido-compra-items/{$this->itemId}/deshacer-revision")->assertOk();

        $this->assertSame(3, $this->cantidad($this->sedePedida));
        $this->assertEqualsCanonicalizing(['S1', 'S2', 'S3'], $inv->series()->pluck('serial')->all());
        $this->assertNull($this->estadoItem());
    }

    public function test_deshacer_traslado_pendiente_solo_lo_cancela(): void
    {
        $t = $this->solicitarTraslado($this->inventario($this->tipo, $this->sedeOrigen, 10));

        $this->postJson("/api/pedido-compra-items/{$this->itemId}/deshacer-revision")->assertOk();

        $this->assertSame(10, $this->cantidad($this->sedeOrigen));
        $this->assertDatabaseHas('traslados_producto', ['id' => $t->id, 'estado' => 'Cancelado']);
        $this->assertNull($this->estadoItem());
    }

    public function test_deshacer_traslado_ya_aprobado_revierte_el_movimiento(): void
    {
        $t = $this->solicitarTraslado($this->inventario($this->tipo, $this->sedeOrigen, 10));
        $this->postJson("/api/traslados-producto/{$t->id}/aprobar")->assertOk();

        $this->postJson("/api/pedido-compra-items/{$this->itemId}/deshacer-revision")->assertOk();

        $this->assertSame(10, $this->cantidad($this->sedeOrigen));
        $this->assertSame(0, $this->cantidad($this->sedePedida));
        $this->assertDatabaseHas('traslados_producto', ['id' => $t->id, 'estado' => 'Cancelado']);
    }

    public function test_deshacer_sin_revision_previa_falla(): void
    {
        $this->postJson("/api/pedido-compra-items/{$this->itemId}/deshacer-revision")->assertStatus(422);
    }

    public function test_deshacer_el_ultimo_item_para_compras_devuelve_el_pedido_a_pendiente(): void
    {
        $this->postJson("/api/pedido-compra-items/{$this->itemId}/enviar-compras")->assertOk();
        $this->putJson("/api/pedidos-compra/{$this->pedidoId}", ['estado' => 'Enviado a compras', 'estado_compra' => 'Pendiente'])->assertOk();

        $this->postJson("/api/pedido-compra-items/{$this->itemId}/deshacer-revision")->assertOk()
            ->assertJsonPath('estado', 'Pendiente Aprobación')->assertJsonPath('estado_compra', null);
    }

    public function test_reenviar_acta_de_traslado_solo_si_el_traslado_fue_aprobado(): void
    {
        $this->postJson("/api/pedido-compra-items/{$this->itemId}/acta-traslado")->assertStatus(422);

        $t = $this->solicitarTraslado($this->inventario($this->tipo, $this->sedeOrigen, 10));
        $this->postJson("/api/traslados-producto/{$t->id}/aprobar")->assertOk();

        Mail::fake(); // reinicia el conteo
        $this->postJson("/api/pedido-compra-items/{$this->itemId}/acta-traslado")->assertOk()->assertJsonPath('enviada', true);
        Mail::assertSent(ActaTrasladoPedidoMail::class, 1);
    }

    // ── Asignación de pedidos + acta de entrega ─────────────────────────────

    public function test_no_se_puede_asignar_un_pedido_sin_productos_listos(): void
    {
        $gestor = $this->usuario('th', ['name' => 'Gestor Compras']);

        $this->patchJson("/api/pedidos-compra/{$this->pedidoId}/asignar", ['asignado_a_user_id' => $gestor->id])
            ->assertStatus(422);

        $this->assertDatabaseHas('pedidos_compra', ['id' => $this->pedidoId, 'asignado_a_user_id' => null]);
        Mail::assertNothingSent();
    }

    public function test_asignar_un_pedido_listo_envia_el_acta_al_responsable_no_al_gestor(): void
    {
        $this->inventario($this->tipo, $this->sedePedida, 5);
        $this->postJson("/api/pedido-compra-items/{$this->itemId}/stock-local", ['observacion' => 'ok'])->assertOk();
        $gestor = $this->usuario('th', ['name' => 'Gestor Compras', 'email' => 'gestor@test.co']);

        $this->patchJson("/api/pedidos-compra/{$this->pedidoId}/asignar", ['asignado_a_user_id' => $gestor->id])
            ->assertOk()->assertJsonPath('acta.enviada', true)->assertJsonPath('asignado_a.name', 'Gestor Compras');

        Mail::assertSent(ActaEntregaPedidoMail::class, fn ($m) => $m->hasTo('responsable@test.co') && !$m->hasTo('gestor@test.co'));
    }

    public function test_si_el_responsable_no_tiene_correo_real_la_asignacion_igual_se_guarda(): void
    {
        $this->inventario($this->tipo, $this->sedePedida, 5);
        $this->postJson("/api/pedido-compra-items/{$this->itemId}/stock-local", ['observacion' => 'ok'])->assertOk();
        // El responsable solo tiene el correo autogenerado "{cedula}@..." => no es una casilla real
        $this->responsable->update(['cedula' => '123', 'email' => '123@avanzaconoce.com']);
        $gestor = $this->usuario('th', ['name' => 'Gestor Compras']);

        $this->patchJson("/api/pedidos-compra/{$this->pedidoId}/asignar", ['asignado_a_user_id' => $gestor->id])
            ->assertOk()->assertJsonPath('acta.enviada', false);

        $this->assertDatabaseHas('pedidos_compra', ['id' => $this->pedidoId, 'asignado_a_user_id' => $gestor->id]);
        Mail::assertNothingSent();
    }

    public function test_desasignar_no_envia_ningun_acta(): void
    {
        $this->inventario($this->tipo, $this->sedePedida, 5);
        $this->postJson("/api/pedido-compra-items/{$this->itemId}/stock-local", ['observacion' => 'ok'])->assertOk();
        $gestor = $this->usuario('th', ['name' => 'Gestor Compras']);
        $this->patchJson("/api/pedidos-compra/{$this->pedidoId}/asignar", ['asignado_a_user_id' => $gestor->id])->assertOk();

        Mail::fake();
        $this->patchJson("/api/pedidos-compra/{$this->pedidoId}/asignar", ['asignado_a_user_id' => null])->assertOk();

        $this->assertDatabaseHas('pedidos_compra', ['id' => $this->pedidoId, 'asignado_a_user_id' => null]);
        Mail::assertNothingSent();
    }

    public function test_asignar_a_un_usuario_inexistente_falla(): void
    {
        $this->patchJson("/api/pedidos-compra/{$this->pedidoId}/asignar", ['asignado_a_user_id' => 999999])
            ->assertStatus(422)->assertJsonValidationErrors('asignado_a_user_id');
    }
}
