<?php

namespace Tests\Feature\Validacion;

use App\Models\Auditoria;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Los filtros "desde / hasta" del servidor incluyen los dos extremos, y lo que el sistema fecha
 * solo (now()) cae en el día de Colombia: antes la app estaba en UTC y lo hecho desde las 7 p. m.
 * quedaba en el día siguiente.
 */
class FiltrosPorFechaTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_la_app_esta_en_hora_de_colombia(): void
    {
        $this->assertSame('America/Bogota', config('app.timezone'));
    }

    public function test_auditoria_filtra_entre_dos_fechas_con_los_extremos_incluidos(): void
    {
        $this->actuarComo('admin');
        foreach (['2026-10-31 23:59:59', '2026-11-01 00:00:00', '2026-11-03 23:59:59', '2026-11-04 00:00:00'] as $i => $fecha) {
            Auditoria::create(['modelo' => 'Prueba', 'accion' => 'actualizado', 'proceso' => 'Prueba', 'descripcion' => "fila {$i}", 'created_at' => $fecha]);
        }

        $filas = $this->getJson('/api/auditoria?proceso=Prueba&fecha_inicio=2026-11-01&fecha_fin=2026-11-03&por_pagina=100')
            ->assertOk()->json('data');

        $this->assertEqualsCanonicalizing(['fila 1', 'fila 2'], array_column($filas, 'descripcion'));
    }

    public function test_lo_hecho_a_las_8_pm_queda_en_ese_dia(): void
    {
        $this->actuarComo('admin');
        Carbon::setTestNow(Carbon::parse('2026-11-09 20:30:00', 'America/Bogota'));
        Auditoria::create(['modelo' => 'Prueba', 'accion' => 'actualizado', 'proceso' => 'Noche', 'descripcion' => 'x', 'created_at' => now()]);

        $this->getJson('/api/auditoria?proceso=Noche&fecha_inicio=2026-11-09&fecha_fin=2026-11-09')
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.created_at', '2026-11-09 20:30:00');
    }

    public function test_work_orders_filtran_por_fecha_de_estado_con_los_extremos_incluidos(): void
    {
        $this->actuarComo('admin');
        foreach (['2026-10-31 23:00', '2026-11-01 00:00', '2026-11-03 23:59', '2026-11-04 00:00'] as $i => $fecha) {
            WorkOrder::create(['numero_wo' => "WO-F{$i}", 'estado' => 'Asignado', 'fecha_estado' => $fecha]);
        }

        $wos = $this->getJson('/api/work-orders?fecha_desde=2026-11-01&fecha_hasta=2026-11-03')->assertOk()->json();

        $this->assertEqualsCanonicalizing(['WO-F1', 'WO-F2'], array_column($wos, 'numero_wo'));
    }
}
