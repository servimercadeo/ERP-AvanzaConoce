<?php

namespace Tests\Feature\Catalogos;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class SedesTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actuarComo('general');
    }

    public function test_crear_editar_y_eliminar_sede(): void
    {
        $nombre = $this->unico('SEDE');

        $id = $this->postJson('/api/sedes', ['nombre' => $nombre, 'direccion' => 'Calle 1', 'estado' => 'Activa'])
            ->assertCreated()->json('id');
        $this->assertDatabaseHas('sedes', ['id' => $id, 'nombre' => $nombre]);

        $this->putJson("/api/sedes/$id", ['nombre' => $nombre . ' B', 'direccion' => 'Calle 2'])->assertOk();
        $this->assertDatabaseHas('sedes', ['id' => $id, 'direccion' => 'Calle 2']);

        $this->deleteJson("/api/sedes/$id")->assertNoContent();
        $this->assertDatabaseMissing('sedes', ['id' => $id]);
    }

    public function test_nombre_de_sede_es_obligatorio(): void
    {
        $this->postJson('/api/sedes', ['direccion' => 'Sin nombre'])->assertStatus(422)->assertJsonValidationErrors('nombre');
    }

    public function test_options_devuelve_los_catalogos_para_el_formulario(): void
    {
        $this->sede('SEDE OPCIONES');

        $this->getJson('/api/sedes/options')
            ->assertOk()
            ->assertJsonStructure(['users', 'ciudades', 'sedes', 'regionales', 'proyectos']);
    }

    public function test_filtro_por_estado(): void
    {
        $activa = $this->postJson('/api/sedes', ['nombre' => $this->unico('ACTIVA'), 'estado' => 'Activa'])->json('id');
        $cerrada = $this->postJson('/api/sedes', ['nombre' => $this->unico('CERRADA'), 'estado' => 'Cerrada'])->json('id');

        $ids = collect($this->getJson('/api/sedes?estado=Activa')->json())->pluck('id');

        $this->assertTrue($ids->contains($activa));
        $this->assertFalse($ids->contains($cerrada));
    }

    /**
     * El filtro de búsqueda mezcla where + orWhere sin agrupar: "nombre LIKE OR codigo LIKE
     * AND estado = ?" se evalúa como "nombre LIKE OR (codigo LIKE AND estado = ?)", así que
     * una sede que coincide por nombre se cuela aunque no cumpla el filtro de estado.
     */
    public function test_buscar_por_texto_respeta_el_filtro_de_estado(): void
    {
        $activa = $this->postJson('/api/sedes', ['nombre' => 'BUSCABLE ACTIVA', 'estado' => 'Activa'])->json('id');
        $cerrada = $this->postJson('/api/sedes', ['nombre' => 'BUSCABLE CERRADA', 'estado' => 'Cerrada'])->json('id');

        $ids = collect($this->getJson('/api/sedes?search=BUSCABLE&estado=Activa')->json())->pluck('id');

        $this->assertTrue($ids->contains($activa));
        $this->assertFalse($ids->contains($cerrada), 'Una sede Cerrada apareció al filtrar por estado Activa.');
    }

    public function test_renombrar_una_sede_se_refleja_en_los_pedidos_que_ya_la_usaban(): void
    {
        $sedeId = $this->sede('SEDE ORIGINAL');
        $tipo = $this->tipoProducto();

        $pedidoId = $this->postJson('/api/pedidos-compra', [
            'tipo_responsable' => 'Empleado', 'responsable' => 'Alguien', 'sede' => 'SEDE ORIGINAL',
            'clase' => 'X', 'concepto' => 'Y', 'items' => [['tipo_producto_id' => $tipo, 'cantidad' => 1]],
        ])->assertCreated()->json('id');

        $this->assertDatabaseHas('pedidos_compra', ['id' => $pedidoId, 'sede_id' => $sedeId]);

        $this->putJson("/api/sedes/$sedeId", ['nombre' => 'SEDE RENOMBRADA'])->assertOk();

        $this->getJson("/api/pedidos-compra/$pedidoId")->assertOk()->assertJsonPath('sede', 'SEDE RENOMBRADA');
    }
}
