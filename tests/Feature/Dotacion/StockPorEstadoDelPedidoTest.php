<?php

namespace Tests\Feature\Dotacion;

use App\Models\Contrato;
use App\Models\InventarioDotacion;
use App\Models\PedidoAutomatico;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * El inventario de dotación debe cuadrar en cualquier cambio de estado del pedido: las
 * prendas salen del stock al quedar "En proceso" (Activo) o Completado, y vuelven al
 * cancelarse, devolverse o regresar a Pendiente. Nunca se descuentan ni devuelven dos veces.
 */
class StockPorEstadoDelPedidoTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private User $empleado;
    private InventarioDotacion $camisa;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::store('file')->forget('inventario-dotacion:flat');
        $this->actuarComo('general');
        $this->empleado = $this->usuario('general', ['cedula' => '2001']);
        Contrato::create(['empleado_id' => $this->empleado->id, 'cargo' => 'ASESOR', 'estado_contrato' => 'Activo']);
        $this->camisa = InventarioDotacion::create([
            'proyecto' => 'SYM TIGO HOME', 'prenda' => 'CAMISA', 'genero' => 'Masculino', 'talla' => 'M',
            'precio' => 1000, 'cantidad' => 10, 'stock_minimo' => 0,
        ]);
    }

    private function items(int $cantidad = 2): array
    {
        return [['inventario_dotacion_id' => $this->camisa->id, 'cantidad' => $cantidad]];
    }

    private function crear(string $estado): int
    {
        return $this->postJson('/api/pedidos-automaticos', [
            'empleado_id' => $this->empleado->id, 'estado' => $estado, 'items' => $this->items(),
        ])->assertCreated()->json('id');
    }

    private function cambiar(int $id, string $estado, ?array $items = null)
    {
        return $this->putJson("/api/pedidos-automaticos/{$id}", array_filter([
            'empleado_id' => $this->empleado->id, 'estado' => $estado, 'items' => $items ?? $this->items(),
        ]));
    }

    private function stock(): int
    {
        return $this->camisa->fresh()->cantidad;
    }

    public function test_de_en_proceso_a_pendiente_y_de_vuelta_no_descuenta_dos_veces(): void
    {
        $id = $this->crear('Activo');
        $this->assertSame(8, $this->stock());

        $this->cambiar($id, 'Pendiente')->assertOk();
        $this->assertSame(10, $this->stock(), 'En Pendiente las prendas vuelven al inventario.');

        $this->cambiar($id, 'Activo')->assertOk();
        $this->assertSame(8, $this->stock(), 'Al volver a En proceso se descuentan una sola vez.');
    }

    public function test_de_pendiente_a_completado_descuenta_el_stock(): void
    {
        $id = $this->crear('Pendiente');
        $this->assertSame(10, $this->stock());

        $this->cambiar($id, 'Completado')->assertOk();
        $this->assertSame(8, $this->stock());
    }

    public function test_reactivar_un_pedido_cancelado_descuenta_sus_prendas(): void
    {
        $id = $this->crear('Activo');
        $this->cambiar($id, 'Cancelado')->assertOk();
        $this->assertSame(10, $this->stock());

        $this->cambiar($id, 'Activo')->assertOk()->assertJsonCount(1, 'items');
        $this->assertSame(8, $this->stock());
    }

    public function test_devolucion_masiva_no_devuelve_lo_que_nunca_salio_del_stock(): void
    {
        $pendiente = $this->crear('Pendiente');

        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pendiente], 'estado' => 'Devolución'])->assertOk();

        $this->assertSame(10, $this->stock(), 'Un pedido pendiente nunca descontó: no puede sumar al inventario.');
    }

    public function test_reactivar_en_bloque_un_pedido_devuelto_vuelve_a_descontar(): void
    {
        $id = $this->crear('Activo');
        PedidoAutomatico::whereKey($id)->update(['estado' => 'Completado']);
        $this->postJson("/api/pedidos-automaticos/{$id}/devolver")->assertOk();
        $this->assertSame(10, $this->stock());

        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$id], 'estado' => 'Activo'])->assertOk();

        $this->assertSame(8, $this->stock());
    }

    public function test_el_estado_debe_ser_uno_valido(): void
    {
        $id = $this->crear('Activo');

        $this->cambiar($id, 'Inventado')->assertStatus(422)->assertJsonValidationErrors('estado');
        $this->assertSame(8, $this->stock());
    }

    public function test_no_se_borra_una_prenda_que_esta_en_pedidos(): void
    {
        $this->crear('Activo');
        $this->actuarComo('admin');

        $this->deleteJson("/api/inventario-dotacion/{$this->camisa->id}")->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'está en pedidos de dotación'));
        $this->assertDatabaseHas('inventario_dotacion', ['id' => $this->camisa->id]);
    }
}
