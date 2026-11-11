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
 * Pedido de dotación creado a mano: la sede es obligatoria y sus prendas salen (se
 * descuentan) del inventario de esa sede.
 */
class PedidoManualSedeTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private User $empleado;
    private int $pereira;
    private int $cali;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::store('file')->forget(InventarioDotacion::CACHE_KEY_FLAT);
        $this->actuarComo('admin');
        $this->pereira = $this->sede('TIGO HOME PEREIRA');
        $this->cali = $this->sede('TIGO HOME CALI');
        $this->empleado = $this->usuario('general', ['cedula' => '5001', 'genero' => 'Masculino']);
        Contrato::create(['empleado_id' => $this->empleado->id, 'cargo' => 'ASESOR', 'estado_contrato' => 'Activo', 'cliente_proyecto' => 'TIGO HOME']);
    }

    private function prenda(int $sede, string $prenda = 'SYM POLO ML AZUL HOME', int $cantidad = 10, string $proyecto = 'SYM TIGO HOME'): InventarioDotacion
    {
        return InventarioDotacion::create([
            'proyecto' => $proyecto, 'sede_id' => $sede, 'prenda' => $prenda, 'genero' => 'Masculino',
            'talla' => 'M', 'precio' => 1000, 'cantidad' => $cantidad, 'stock_minimo' => 0,
        ]);
    }

    private function crear(array $datos)
    {
        return $this->postJson('/api/pedidos-automaticos', $datos + ['empleado_id' => $this->empleado->id]);
    }

    public function test_sin_sede_no_se_puede_crear(): void
    {
        $polo = $this->prenda($this->pereira);

        $this->crear(['items' => [['inventario_dotacion_id' => $polo->id, 'cantidad' => 1]]])
            ->assertStatus(422)->assertJsonValidationErrors('sede_id');
        $this->assertSame(0, PedidoAutomatico::count());
        $this->assertSame(10, $polo->fresh()->cantidad);
    }

    public function test_las_prendas_se_descuentan_del_inventario_de_la_sede_elegida(): void
    {
        $poloPereira = $this->prenda($this->pereira);
        $poloCali = $this->prenda($this->cali, cantidad: 4);

        $r = $this->crear(['sede_id' => $this->cali, 'items' => [['inventario_dotacion_id' => $poloCali->id, 'cantidad' => 2]]])
            ->assertCreated()->assertJsonPath('sede.nombre', 'TIGO HOME CALI');

        $this->assertSame($this->cali, PedidoAutomatico::find($r->json('id'))->sede_id);
        $this->assertSame(2, $poloCali->fresh()->cantidad);
        $this->assertSame(10, $poloPereira->fresh()->cantidad);
    }

    public function test_una_prenda_de_otra_sede_se_rechaza_sin_tocar_el_inventario(): void
    {
        $poloPereira = $this->prenda($this->pereira);

        $this->crear(['sede_id' => $this->cali, 'items' => [['inventario_dotacion_id' => $poloPereira->id, 'cantidad' => 1]]])
            ->assertStatus(422)->assertJsonValidationErrors('sede_id')
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'TIGO HOME CALI') && str_contains($m, 'TIGO HOME PEREIRA'));
        $this->assertSame(0, PedidoAutomatico::count());
        $this->assertSame(10, $poloPereira->fresh()->cantidad);
    }

    public function test_el_carnet_administrativo_sale_de_la_sede_central_aunque_se_elija_otra(): void
    {
        $polo = $this->prenda($this->cali);
        $carnet = $this->prenda($this->sede('SYM PEREIRA'), 'Carnet', 5, 'SYM ADMINISTRATIVO');

        $this->crear(['sede_id' => $this->cali, 'items' => [
            ['inventario_dotacion_id' => $polo->id, 'cantidad' => 1],
            ['inventario_dotacion_id' => $carnet->id, 'cantidad' => 1],
        ]])->assertCreated();

        $this->assertSame(4, $carnet->fresh()->cantidad);
    }

    public function test_al_editar_no_se_agregan_prendas_de_otra_sede_pero_se_conservan_las_que_ya_tenia(): void
    {
        $poloCali = $this->prenda($this->cali);
        $poloPereira = $this->prenda($this->pereira);
        $id = $this->crear(['sede_id' => $this->cali, 'items' => [['inventario_dotacion_id' => $poloCali->id, 'cantidad' => 1]]])->json('id');

        $this->putJson("/api/pedidos-automaticos/{$id}", ['empleado_id' => $this->empleado->id, 'items' => [
            ['inventario_dotacion_id' => $poloCali->id, 'cantidad' => 2],
            ['inventario_dotacion_id' => $poloPereira->id, 'cantidad' => 1],
        ]])->assertStatus(422)->assertJsonValidationErrors('sede_id');

        $this->putJson("/api/pedidos-automaticos/{$id}", ['empleado_id' => $this->empleado->id, 'items' => [
            ['inventario_dotacion_id' => $poloCali->id, 'cantidad' => 2],
        ]])->assertOk();
        $this->assertSame(8, $poloCali->fresh()->cantidad);
        $this->assertSame(10, $poloPereira->fresh()->cantidad);
    }

    public function test_el_pedido_automatico_guarda_la_sede_de_la_que_sale(): void
    {
        $this->formularioIngreso('6001', ['talla_camisa' => 'M']);
        $empleado = $this->usuario('general', ['cedula' => '6001', 'genero' => 'Masculino']);
        foreach (['SYM POLO ML AZUL HOME', 'SYM GORRA TIGO', 'SYM CARNET'] as $prenda) {
            InventarioDotacion::create(['proyecto' => 'SYM TIGO HOME', 'sede_id' => $this->pereira, 'prenda' => $prenda, 'genero' => 'Masculino',
                'talla' => $prenda === 'SYM POLO ML AZUL HOME' ? 'M' : 'N/A', 'precio' => 0, 'cantidad' => 10, 'stock_minimo' => 0]);
        }

        $r = $this->postJson('/api/contratos', [
            'empleado_id' => $empleado->id, 'tipo_contrato' => 'Indefinido', 'cargo' => 'ASESOR COMERCIAL', 'sede' => 'TIGO HOME CALI',
            'fecha_ingreso' => '2026-11-11', 'salario' => 2000000, 'estado_contrato' => 'Vigente', 'cliente_proyecto' => 'TIGO HOME',
        ])->assertCreated();

        $this->assertSame($this->pereira, PedidoAutomatico::find($r->json('pedido_automatico.id'))->sede_id);
    }
}
