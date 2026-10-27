<?php

namespace Tests\Feature\Inventario;

use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class WorkOrderImportTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private function importar(array $items)
    {
        $this->actingAs($this->usuario('admin'));
        return $this->postJson('/api/work-orders/importar', ['items' => $items])->assertOk();
    }

    public function test_archivo_parcial_sin_columna_de_item_actualiza_todas_las_filas_del_wo(): void
    {
        WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '10', 'estado' => 'Abierta', 'nombre_tecnico' => 'Viejo']);
        WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '20', 'estado' => 'Abierta', 'nombre_tecnico' => 'Viejo']);

        // Lo que manda la pantalla con un Excel que solo tiene "WO" y "Nombre técnico".
        $this->importar([['numero_wo' => 'WO1', 'nombre_tecnico' => 'Nuevo']]);

        $this->assertSame(2, WorkOrder::where('numero_wo', 'WO1')->count());
        $this->assertSame(['Nuevo', 'Nuevo'], WorkOrder::where('numero_wo', 'WO1')->pluck('nombre_tecnico')->all());
        // Lo que no vino en el archivo se conserva.
        $this->assertSame(['Abierta', 'Abierta'], WorkOrder::where('numero_wo', 'WO1')->pluck('estado')->all());
    }

    public function test_archivo_con_item_actualiza_solo_esa_fila_y_conserva_lo_que_no_vino(): void
    {
        WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '10', 'estado' => 'Abierta', 'nombre_tecnico' => 'Viejo']);
        WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '20', 'estado' => 'Abierta', 'nombre_tecnico' => 'Viejo']);

        $this->importar([['numero_wo' => 'WO1', 'numero_item' => '20', 'nombre_tecnico' => 'Nuevo']]);

        $this->assertSame('Viejo', WorkOrder::where(['numero_wo' => 'WO1', 'numero_item' => '10'])->value('nombre_tecnico'));
        $this->assertSame('Nuevo', WorkOrder::where(['numero_wo' => 'WO1', 'numero_item' => '20'])->value('nombre_tecnico'));
        $this->assertSame('Abierta', WorkOrder::where(['numero_wo' => 'WO1', 'numero_item' => '20'])->value('estado'));
    }

    public function test_por_paginas_respeta_la_busqueda_y_sin_page_responde_la_lista_completa(): void
    {
        foreach (range(1, 30) as $i) {
            WorkOrder::create(['numero_wo' => "WO{$i}", 'numero_item' => '', 'municipio' => $i <= 27 ? 'CALI' : 'PASTO']);
        }
        $this->actingAs($this->usuario('admin'));

        $this->getJson('/api/work-orders?page=2&per_page=25&search=CALI')->assertOk()
            ->assertJsonPath('total', 27)->assertJsonPath('last_page', 2)->assertJsonCount(2, 'data');

        $this->assertCount(30, $this->getJson('/api/work-orders')->assertOk()->json());
    }

    public function test_el_resumen_trae_total_y_filtros_solo_de_lo_que_el_usuario_puede_ver(): void
    {
        WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '555', 'estado' => 'Finalizado', 'proveedor' => 'P-CALI']);
        WorkOrder::create(['numero_wo' => 'WO2', 'numero_item' => '', 'cedula_tecnico' => '666', 'estado' => 'Atendido', 'proveedor' => 'P-PASTO']);

        $this->actingAs($this->usuario('admin'));
        $this->getJson('/api/work-orders/resumen')->assertOk()
            ->assertJsonPath('total', 2)->assertJsonPath('estados', ['Atendido', 'Finalizado']);

        $this->actingAs($this->usuario('tecnico', ['cedula' => '555']));
        $this->getJson('/api/work-orders/resumen')->assertOk()
            ->assertJsonPath('total', 1)->assertJsonPath('proveedores', ['P-CALI']);
    }

    public function test_el_tecnico_no_importa_ni_elimina_work_orders(): void
    {
        $ajena = WorkOrder::create(['numero_wo' => 'WO9', 'numero_item' => '', 'cedula_tecnico' => '666']);
        $this->actingAs($this->usuario('tecnico', ['cedula' => '555']));

        $this->deleteJson("/api/work-orders/{$ajena->id}")->assertForbidden();
        $this->postJson('/api/work-orders/importar', ['items' => [['numero_wo' => 'X1']]])->assertForbidden();

        $this->assertTrue(WorkOrder::whereKey($ajena->id)->exists());
        $this->assertFalse(WorkOrder::where('numero_wo', 'X1')->exists());
    }

    public function test_el_tecnico_solo_ve_las_work_orders_de_su_cedula(): void
    {
        WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '555']);
        WorkOrder::create(['numero_wo' => 'WO2', 'numero_item' => '', 'cedula_tecnico' => '666']);
        WorkOrder::create(['numero_wo' => 'WO3', 'numero_item' => '', 'cedula_tecnico' => null]);

        $this->actingAs($this->usuario('tecnico', ['cedula' => '555']));
        $respuesta = $this->getJson('/api/work-orders')->assertOk()->json();
        $wos = collect($respuesta['data'] ?? $respuesta)->pluck('numero_wo')->all();

        $this->assertSame(['WO1'], $wos);
    }
}
