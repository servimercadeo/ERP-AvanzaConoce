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

    public function test_sin_page_completa_sede_vinculacion_supervisor_aliado_y_vehiculo_del_tecnico(): void
    {
        $this->actingAs($this->usuario('admin'));
        $tecnico = $this->usuario('tecnico', [
            'cedula' => '9000000001', 'sede' => 'SYM PEREIRA 123', 'tipo_vinculacion' => 'Directa',
            'jefe_inmediato' => 'Juan Camilo Marín',
        ]);
        \App\Models\Vehiculo::create(['tipo' => 'Carro', 'placa' => 'XYZ123', 'tecnico_asignado_id' => $tecnico->id]);
        WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '9000000001']);

        $wo = $this->getJson('/api/work-orders')->assertOk()->json()[0];

        $this->assertSame('SYM PEREIRA 123', $wo['sede_tecnico']);
        $this->assertSame('Directa', $wo['tipo_vinculacion_tecnico']);
        $this->assertSame('Juan Camilo Marín', $wo['supervisor_tecnico']);
        $this->assertSame('NA', $wo['subagente_aliado_tecnico']);
        $this->assertSame('XYZ123', $wo['placa_vehiculo_tecnico']);
    }

    public function test_importar_guarda_las_columnas_nuevas_del_exporte_macaw(): void
    {
        $this->importar([[
            'numero_wo' => 'WO9', 'subproducto' => 'POS IA01 URBANO IRD HD ONLY', 'tipo_producto' => 'POS',
            'categoria' => 'Instalación', 'problema' => 'Visita técnica', 'nombre_cliente' => 'ANA MARIA',
            'tecnologia' => 'IRD DVR HD', 'fecha_programacion' => '2026-09-15 19:05:00',
            'auxilio' => '4300',
        ]]);

        $wo = WorkOrder::where('numero_wo', 'WO9')->firstOrFail();
        $this->assertSame('POS IA01 URBANO IRD HD ONLY', $wo->subproducto);
        $this->assertSame('POS', $wo->tipo_producto);
        $this->assertSame('Instalación', $wo->categoria);
        $this->assertSame('Visita técnica', $wo->problema);
        $this->assertSame('ANA MARIA', $wo->nombre_cliente);
        $this->assertSame('IRD DVR HD', $wo->tecnologia);
        $this->assertSame('2026-09-15 19:05:00', $wo->fecha_programacion->format('Y-m-d H:i:s'));
        $this->assertSame('4300', $wo->auxilio);
    }

    public function test_importar_guarda_las_columnas_nuevas_del_excel_de_origen_del_proveedor(): void
    {
        $this->importar([[
            'numero_wo' => 'WO10', 'dias_atraso' => '2', 'estado_descarga' => 'Completa',
            'georreferencia' => '1150', 'nombre_cuadrilla_tecnico' => 'LUIS FERNEY',
            'apellido_cuadrilla_tecnico' => 'MENA CARDENA', 'pais' => 'Colombia',
            'puntos_referencia' => 'BUENAVENTURA', 'codigo_postal' => 'W00708001',
            'agrupacion' => 'Mixto', 'estado_orden_trabajo' => 'Finalizada',
            'telefono_principal' => '315-5262458', 'recursos' => 'IRD HD ONLY',
            'reiteracion_servicio' => '0', 'estado_visita' => 'Completa', 'numero_visita' => '1-14AA7CXR',
            'coordenada_x' => '3,88', 'coordenada_y' => '-77,01', 'razones' => 'Problema de interferencia',
            'numero_orden_trabajo' => '1-87687508566', 'codigo_sl' => 'IA01', 'clase_cliente' => 'Pospago',
            'agendamiento_externo' => 'N', 'descarga_materiales_obligatoria' => 'Y',
            'descarga_materiales_confirmada' => 'Y', 'id_encabezado_pedido' => '1-14A6VMMV',
        ]]);

        $wo = WorkOrder::where('numero_wo', 'WO10')->firstOrFail();
        $this->assertSame(2, $wo->dias_atraso);
        $this->assertSame(0, $wo->reiteracion_servicio);
        $this->assertSame('LUIS FERNEY', $wo->nombre_cuadrilla_tecnico);
        $this->assertSame('MENA CARDENA', $wo->apellido_cuadrilla_tecnico);
        $this->assertSame('Colombia', $wo->pais);
        $this->assertSame('Finalizada', $wo->estado_orden_trabajo);
        $this->assertSame('1-87687508566', $wo->numero_orden_trabajo);
        $this->assertSame('Pospago', $wo->clase_cliente);
        $this->assertSame('1-14A6VMMV', $wo->id_encabezado_pedido);
    }

    public function test_sin_page_usa_el_nombre_del_aliado_cuando_el_tecnico_tiene_uno(): void
    {
        $this->actingAs($this->usuario('admin'));
        $aliado = \App\Models\Aliado::create([
            'tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900111222-1', 'nombre' => 'ALIADO PRUEBA SAS',
        ]);
        $this->usuario('tecnico', ['cedula' => '7000000001', 'aliado_id' => $aliado->id]);
        WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '', 'cedula_tecnico' => '7000000001']);

        $wo = $this->getJson('/api/work-orders')->assertOk()->json()[0];

        $this->assertSame('ALIADO PRUEBA SAS', $wo['subagente_aliado_tecnico']);
    }
}
