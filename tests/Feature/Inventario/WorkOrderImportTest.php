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
