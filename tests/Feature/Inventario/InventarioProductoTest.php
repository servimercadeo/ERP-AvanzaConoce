<?php

namespace Tests\Feature\Inventario;

use App\Models\InventarioProducto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Inventarios > Activos / Materiales / Equipos / EPP / Herramientas / Inventario General.
 */
class InventarioProductoTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private int $sede;
    private int $tipo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actuarComo('consultor');
        $this->sede = $this->sede();
        $this->tipo = $this->tipoProducto(null, 'Equipos');
    }

    public function test_agregar_stock_crea_la_fila(): void
    {
        $this->postJson('/api/inventario-productos', [
            'tipo_producto_id' => $this->tipo, 'sede_id' => $this->sede, 'cantidad' => 5, 'precio' => 2500, 'stock_minimo' => 2,
        ])->assertCreated()->assertJsonPath('cantidad', 5)->assertJsonPath('precio', 2500);
    }

    public function test_agregar_stock_a_un_item_existente_suma_en_vez_de_duplicar(): void
    {
        $body = ['tipo_producto_id' => $this->tipo, 'sede_id' => $this->sede, 'cantidad' => 5];

        $this->postJson('/api/inventario-productos', $body)->assertCreated();
        $this->postJson('/api/inventario-productos', $body)->assertOk()->assertJsonPath('cantidad', 10);

        $this->assertSame(1, InventarioProducto::where('tipo_producto_id', $this->tipo)->where('sede_id', $this->sede)->count());
    }

    public function test_la_misma_talla_distingue_filas_distintas(): void
    {
        $base = ['tipo_producto_id' => $this->tipo, 'sede_id' => $this->sede, 'cantidad' => 1];

        $this->postJson('/api/inventario-productos', $base + ['talla' => 'M'])->assertCreated();
        $this->postJson('/api/inventario-productos', $base + ['talla' => 'L'])->assertCreated();

        $this->assertSame(2, InventarioProducto::where('tipo_producto_id', $this->tipo)->count());
    }

    public function test_validaciones_de_alta(): void
    {
        $this->postJson('/api/inventario-productos', [])->assertStatus(422)
            ->assertJsonValidationErrors(['tipo_producto_id', 'sede_id', 'cantidad']);

        $this->postJson('/api/inventario-productos', [
            'tipo_producto_id' => $this->tipo, 'sede_id' => $this->sede, 'cantidad' => -1,
        ])->assertStatus(422)->assertJsonValidationErrors('cantidad');
    }

    public function test_seriales_deben_coincidir_con_la_cantidad(): void
    {
        $this->postJson('/api/inventario-productos', [
            'tipo_producto_id' => $this->tipo, 'sede_id' => $this->sede, 'cantidad' => 3, 'series' => ['A1', 'A2'],
        ])->assertStatus(422)->assertJsonValidationErrors('series');
    }

    public function test_un_serial_no_puede_repetirse_en_todo_el_inventario(): void
    {
        $otraSede = $this->sede();
        $this->postJson('/api/inventario-productos', [
            'tipo_producto_id' => $this->tipo, 'sede_id' => $this->sede, 'cantidad' => 1, 'series' => ['SER-1'],
        ])->assertCreated();

        $this->postJson('/api/inventario-productos', [
            'tipo_producto_id' => $this->tipo, 'sede_id' => $otraSede, 'cantidad' => 1, 'series' => ['SER-1'],
        ])->assertStatus(422)->assertJsonValidationErrors('series');

        // Repetido dentro de la misma petición
        $this->postJson('/api/inventario-productos', [
            'tipo_producto_id' => $this->tipo, 'sede_id' => $otraSede, 'cantidad' => 2, 'series' => ['DUP', 'DUP'],
        ])->assertStatus(422);
    }

    public function test_editar_reemplaza_los_seriales_solo_si_vienen_en_la_peticion(): void
    {
        $inv = $this->inventario($this->tipo, $this->sede, 2, ['S1', 'S2']);

        // Sin "series": no se tocan
        $this->putJson("/api/inventario-productos/{$inv->id}", ['cantidad' => 2, 'precio' => 999])->assertOk();
        $this->assertSame(2, $inv->series()->count());

        // Con "series": reemplaza
        $this->putJson("/api/inventario-productos/{$inv->id}", ['cantidad' => 2, 'series' => ['N1', 'N2']])->assertOk();
        $this->assertEqualsCanonicalizing(['N1', 'N2'], $inv->series()->pluck('serial')->all());
    }

    public function test_editar_reenviando_sus_propios_seriales_no_choca_consigo_mismo(): void
    {
        $inv = $this->inventario($this->tipo, $this->sede, 2, ['S1', 'S2']);

        $this->putJson("/api/inventario-productos/{$inv->id}", ['cantidad' => 2, 'series' => ['S1', 'S2']])->assertOk();
    }

    public function test_eliminar_una_fila_de_inventario(): void
    {
        $inv = $this->inventario($this->tipo, $this->sede, 1);

        $this->deleteJson("/api/inventario-productos/{$inv->id}")->assertNoContent();
        $this->assertDatabaseMissing('inventario_productos', ['id' => $inv->id]);
    }

    public function test_listado_filtra_por_categoria_sede_y_busqueda(): void
    {
        $otraSede = $this->sede();
        $tipoEpp = $this->tipoProducto('CASCO-UNICO-XYZ', 'EPP');
        $a = $this->inventario($this->tipo, $this->sede, 1);
        $b = $this->inventario($tipoEpp, $otraSede, 1);

        $porCategoria = collect($this->getJson('/api/inventario-productos?categoria=EPP')->json())->pluck('id');
        $this->assertTrue($porCategoria->contains($b->id));
        $this->assertFalse($porCategoria->contains($a->id));

        $porSede = collect($this->getJson("/api/inventario-productos?sede_id={$this->sede}")->json())->pluck('id');
        $this->assertTrue($porSede->contains($a->id));
        $this->assertFalse($porSede->contains($b->id));

        $porTexto = collect($this->getJson('/api/inventario-productos?search=CASCO-UNICO')->json())->pluck('id');
        $this->assertSame([$b->id], $porTexto->all());
    }

    public function test_resumen_cuenta_por_categoria(): void
    {
        $antes = $this->getJson('/api/inventario-productos/resumen?categoria=Equipos')->json('total');
        $this->inventario($this->tipo, $this->sede, 1);

        $this->getJson('/api/inventario-productos/resumen?categoria=Equipos')->assertJsonPath('total', $antes + 1);
    }

    // ── Importación masiva (todo o nada) ─────────────────────────────────────

    public function test_importar_crea_y_suma_filas(): void
    {
        $existente = $this->inventario($this->tipo, $this->sede, 4);

        $this->postJson('/api/inventario-productos/importar', [
            'categoria' => 'Equipos',
            'items' => [
                ['tipo_producto_id' => $this->tipo, 'sede_id' => $this->sede, 'cantidad' => 6],
                ['tipo_producto_id' => $this->tipo, 'sede_id' => $this->sede(), 'cantidad' => 2, 'series' => ['IMP-1', 'IMP-2']],
            ],
        ])->assertOk()->assertJson(['creados' => 1, 'actualizados' => 1]);

        $this->assertSame(10, $existente->fresh()->cantidad);
    }

    public function test_importar_es_todo_o_nada_si_una_fila_falla(): void
    {
        $tipoEpp = $this->tipoProducto(null, 'EPP');

        $this->postJson('/api/inventario-productos/importar', [
            'categoria' => 'Equipos',
            'items' => [
                ['tipo_producto_id' => $this->tipo, 'sede_id' => $this->sede, 'cantidad' => 3],   // válida
                ['tipo_producto_id' => $tipoEpp,    'sede_id' => $this->sede, 'cantidad' => 1],   // categoría equivocada
            ],
        ])->assertStatus(422)->assertJsonStructure(['errores']);

        $this->assertSame(0, InventarioProducto::where('tipo_producto_id', $this->tipo)->count(), 'La fila válida no debió guardarse.');
    }

    public function test_importar_rechaza_seriales_repetidos_o_ya_existentes(): void
    {
        $this->inventario($this->tipo, $this->sede, 1, ['YA-EXISTE']);

        $this->postJson('/api/inventario-productos/importar', ['items' => [
            ['tipo_producto_id' => $this->tipo, 'sede_id' => $this->sede(), 'cantidad' => 1, 'series' => ['YA-EXISTE']],
        ]])->assertStatus(422);

        $this->postJson('/api/inventario-productos/importar', ['items' => [
            ['tipo_producto_id' => $this->tipo, 'sede_id' => $this->sede(), 'cantidad' => 1, 'series' => ['REP']],
            ['tipo_producto_id' => $this->tipo, 'sede_id' => $this->sede(), 'cantidad' => 1, 'series' => ['REP']],
        ]])->assertStatus(422);
    }

    public function test_importar_rechaza_cantidad_de_seriales_distinta(): void
    {
        $this->postJson('/api/inventario-productos/importar', ['items' => [
            ['tipo_producto_id' => $this->tipo, 'sede_id' => $this->sede, 'cantidad' => 3, 'series' => ['UNO']],
        ]])->assertStatus(422);
    }
}
