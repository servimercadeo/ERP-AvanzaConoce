<?php

namespace Tests\Feature\Inventario;

use App\Models\Aliado;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Las WO se enlazan con su técnico (y su aliado) por la Cédula Técnico (`cedula_tecnico`),
 * venga como venga escrita en el archivo. Importe masivo por lotes, como la pantalla.
 */
class WorkOrderEnlaceTecnicoTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    public function test_normaliza_la_cedula_como_users_cedula(): void
    {
        foreach ([
            '1.085.293.826' => '1085293826', '1085293826.0' => '1085293826', ' 1085293826 ' => '1085293826',
            '108529382 6' => '1085293826', '1,085,293,826' => '1085293826', '1085293826' => '1085293826',
            '' => null, '   ' => null,
        ] as $entrada => $esperado) {
            $this->assertSame($esperado, WorkOrder::normalizarCedula($entrada), "«{$entrada}»");
        }
        $this->assertSame('1085293826', WorkOrder::normalizarCedula(1085293826));
        $this->assertNull(WorkOrder::normalizarCedula(null));
    }

    public function test_importe_masivo_enlaza_cada_wo_con_su_tecnico_y_su_aliado(): void
    {
        // Técnico directo (empleado), técnicos de un aliado empresa, aliados indirectos (NIT y CE).
        $directo = $this->usuario('tecnico', ['cedula' => '1085293826']);
        $empresa = Aliado::create(['tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900111222-3', 'nombre' => 'EMPRESA SAS']);
        $tecEmpresaA = $this->usuario('tecnico', ['cedula' => '72243190', 'aliado_id' => $empresa->id]);
        $tecEmpresaB = $this->usuario('tecnico', ['cedula' => '1055834475', 'aliado_id' => $empresa->id]);
        // Aliado indirecto con NIT de persona natural: su usuario técnico queda con la cédula sin DV.
        $indNit = Aliado::create(['tipo' => 'tecnico', 'tipo_documento' => 'NIT', 'documento' => '1234567-8', 'nombre' => 'PEDRO PEREZ']);
        $tecIndNit = $this->usuario('tecnico', ['cedula' => '1234567', 'aliado_id' => $indNit->id]);
        $indCe = Aliado::create(['tipo' => 'tecnico', 'tipo_documento' => 'CE', 'documento' => '5544332', 'nombre' => 'JUAN EXTRANJERO']);
        $tecIndCe = $this->usuario('tecnico', ['cedula' => '5544332', 'aliado_id' => $indCe->id]);

        // Cómo trae cada cédula el archivo (texto con puntos, número, ".0", espacios...).
        $formatos = [
            '1085293826' => ['1.085.293.826', 1085293826, '1085293826.0', '108529382 6'],
            '72243190'   => ['72243190', ' 72.243.190 '],
            '1055834475' => [1055834475, '1,055,834,475'],
            '1234567'    => ['1.234.567', '1234567'],
            '5544332'    => ['5544332', '5544332.0'],
            'SIN_ERP'    => ['99999999', '88.888.888'], // técnicos que no están en el ERP
        ];
        $claves = array_keys($formatos);
        $esperado = array_fill_keys($claves, ['total' => 0, 'finalizadas' => 0, 'atendidas' => 0]);
        $items = [];
        $n = 3000;
        for ($i = 0; $i < $n; $i++) {
            $clave = $claves[$i % count($claves)];
            $variantes = $formatos[$clave];
            $estado = $i % 5 === 0 ? 'Atendido' : 'Finalizado';
            $items[] = ['numero_wo' => "WO-{$i}", 'numero_item' => '1', 'estado' => $estado, 'cedula_tecnico' => $variantes[$i % count($variantes)],
                'nombre_tecnico' => "TECNICO {$clave}", 'servicio' => 'INSTALACION', 'fecha_finalizacion' => '2026-10-01 10:00'];
            $esperado[$clave]['total']++;
            $esperado[$clave][$estado === 'Atendido' ? 'atendidas' : 'finalizadas']++;
        }

        // Igual que la pantalla: lotes de 1000.
        $this->actingAs($this->usuario('admin'));
        $creadas = 0;
        foreach (array_chunk($items, 1000) as $lote) {
            $creadas += $this->postJson('/api/work-orders/importar', ['items' => $lote])->assertOk()->json('creadas');
        }
        $this->assertSame($n, $creadas);
        $this->assertSame(0, WorkOrder::where('cedula_tecnico', 'regexp', '[[:space:].,]')->count(), 'Ninguna cédula queda con formato');

        // El técnico directo ve solo las suyas y puede cambiarles el estado (no las de otro).
        $this->actingAs($directo);
        $r = $this->getJson('/api/work-orders?page=1&per_page=25')->assertOk();
        $this->assertSame($esperado['1085293826']['total'], $r->json('total'), 'WO que ve el técnico directo');
        $this->assertTrue(collect($r->json('data'))->every(fn ($wo) => $wo['cedula_tecnico'] === '1085293826'));
        $this->assertSame($esperado['1085293826']['total'], $this->getJson('/api/work-orders/resumen')->assertOk()->json('total'));
        $suya = WorkOrder::where('cedula_tecnico', '1085293826')->where('estado', 'Atendido')->firstOrFail();
        $this->putJson("/api/work-orders/{$suya->id}", ['estado' => 'Finalizado'])->assertOk();
        $this->assertSame(['Finalizado', '1085293826'], [$suya->fresh()->estado, $suya->fresh()->cedula_tecnico_cierre]);
        $ajena = WorkOrder::where('cedula_tecnico', '72243190')->firstOrFail();
        $this->putJson("/api/work-orders/{$ajena->id}", ['estado' => 'Finalizado'])->assertNotFound();
        $suya->forceFill(['estado' => 'Atendido'])->save(); // los conteos de abajo cuentan con el estado original

        // Ningún aliado entra al módulo Work Orders (ni técnicos de un aliado empresa ni aliados
        // indirectos): ven solo las suyas en la ficha de su aliado (Operaciones > Aliados), sin editar.
        foreach ([[$tecEmpresaA, '72243190'], [$tecEmpresaB, '1055834475'], [$tecIndNit, '1234567'], [$tecIndCe, '5544332']] as [$tec, $clave]) {
            $this->actingAs($tec);
            $this->getJson('/api/work-orders?page=1&per_page=25')->assertForbidden();
            $this->getJson('/api/work-orders/resumen')->assertForbidden();
            $this->putJson("/api/work-orders/{$ajena->id}", ['estado' => 'Finalizado'])->assertForbidden();

            $this->assertSame([$tec->aliado_id], collect($this->getJson('/api/aliados?page=1')->assertOk()->json('data'))->pluck('id')->all());
            $ficha = $this->getJson("/api/aliados/{$tec->aliado_id}")->assertOk();
            $this->assertSame([$clave], collect($ficha->json('tecnicos'))->pluck('cedula')->all(), 'Solo se ve a sí mismo');
            $this->assertSame($esperado[$clave]['total'], $ficha->json('work_orders.asignadas'));
            $wos = $this->getJson("/api/aliados/{$tec->aliado_id}/work-orders?page=1")->assertOk();
            $this->assertSame($esperado[$clave]['total'], $wos->json('total'), "WO del técnico indirecto {$clave} en su ficha");
            $this->assertTrue(collect($wos->json('data'))->every(fn ($wo) => $wo['cedula_tecnico'] === $clave));
            $otroAliado = $tec->aliado_id === $empresa->id ? $indNit->id : $empresa->id;
            $this->getJson("/api/aliados/{$otroAliado}")->assertNotFound();
            $this->getJson("/api/aliados/{$otroAliado}/work-orders?page=1")->assertNotFound();
            $this->putJson("/api/aliados/{$tec->aliado_id}", ['nombre' => 'X'])->assertForbidden();
        }

        // El técnico directo no ve Aliados (la matriz se lo niega a su rol).
        $this->actingAs($directo);
        $this->getJson('/api/aliados?page=1')->assertForbidden();
        $this->getJson("/api/aliados/{$empresa->id}/work-orders?page=1")->assertForbidden();

        // Contadores de cada aliado = suma de las WO de sus técnicos.
        $this->actingAs($this->usuario('admin'));
        $aliados = collect($this->getJson('/api/aliados')->assertOk()->json())->keyBy('id');
        $suma = fn (array $cl) => ['asignadas' => array_sum(array_map(fn ($c) => $esperado[$c]['total'], $cl)),
            'atendidas' => array_sum(array_map(fn ($c) => $esperado[$c]['atendidas'], $cl)),
            'finalizadas' => array_sum(array_map(fn ($c) => $esperado[$c]['finalizadas'], $cl))];
        $this->assertEquals($suma(['72243190', '1055834475']), $aliados[$empresa->id]['work_orders']);
        $this->assertEquals($suma(['1234567']), $aliados[$indNit->id]['work_orders']);
        $this->assertEquals($suma(['5544332']), $aliados[$indCe->id]['work_orders']);
        // Ficha del aliado: todas sus WO, de 25 en 25, con los mismos totales que los contadores.
        $base = "/api/aliados/{$empresa->id}/work-orders";
        $p1 = $this->getJson("{$base}?page=1")->assertOk();
        $total = $suma(['72243190', '1055834475']);
        $this->assertSame([25, $total['asignadas'], (int) ceil($total['asignadas'] / 25)], [count($p1->json('data')), $p1->json('total'), $p1->json('last_page')]);
        $ultima = $this->getJson("{$base}?page=" . $p1->json('last_page'))->assertOk();
        $this->assertSame($total['asignadas'] - 25 * ($p1->json('last_page') - 1), count($ultima->json('data')));
        $vistas = collect(range(1, $p1->json('last_page')))->flatMap(fn ($p) => $this->getJson("{$base}?page={$p}")->json('data'))->pluck('id');
        $this->assertSame($total['asignadas'], $vistas->unique()->count(), 'Recorriendo las páginas se ven todas, sin repetir');
        // Filtros sobre todas (no solo la página): estado, técnico y N° de WO.
        $this->assertSame($total['atendidas'], $this->getJson("{$base}?page=1&estado=atendidas")->json('total'));
        $this->assertSame($total['finalizadas'], $this->getJson("{$base}?page=1&estado=finalizadas")->json('total'));
        $this->assertSame($esperado['72243190']['total'], $this->getJson("{$base}?page=1&cedula_tecnico=72243190")->json('total'));
        $unaWo = WorkOrder::where('cedula_tecnico', '1055834475')->orderByDesc('id')->value('numero_wo'); // ej. WO-2998: ningún otro número lo contiene
        // Búsqueda parcial: encuentra esa WO y solo WO que contienen el texto.
        $encontradas = collect($this->getJson("{$base}?page=1&search={$unaWo}")->json('data'))->pluck('numero_wo');
        $this->assertContains($unaWo, $encontradas);
        $this->assertTrue($encontradas->every(fn ($wo) => str_contains($wo, $unaWo)));
        $this->assertSame(0, $this->getJson("{$base}?page=1&search=NO-EXISTE")->json('total'));

        // Exporte: cada WO trae el aliado de su técnico (o NA si es directo; vacío si no está en el ERP).
        $exporte = collect($this->getJson('/api/work-orders')->assertOk()->json())->groupBy('cedula_tecnico');
        $this->assertSame(['EMPRESA SAS'], $exporte['72243190']->pluck('subagente_aliado_tecnico')->unique()->values()->all());
        $this->assertSame(['PEDRO PEREZ'], $exporte['1234567']->pluck('subagente_aliado_tecnico')->unique()->values()->all());
        $this->assertSame(['NA'], $exporte['1085293826']->pluck('subagente_aliado_tecnico')->unique()->values()->all());
        $this->assertSame([null], $exporte['88888888']->pluck('subagente_aliado_tecnico')->unique()->values()->all());

        // Reimportar el mismo archivo no duplica.
        foreach (array_chunk($items, 1000) as $lote) {
            $this->postJson('/api/work-orders/importar', ['items' => $lote])->assertOk()->assertJsonPath('creadas', 0);
        }
        $this->assertSame($n, WorkOrder::count());
    }

    public function test_el_exporte_toma_al_tecnico_de_la_cedula_tecnico_no_del_agendado(): void
    {
        $aliado = Aliado::create(['tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900444555-6', 'nombre' => 'ALIADO REAL']);
        $this->usuario('tecnico', ['cedula' => '111', 'aliado_id' => $aliado->id]);
        $this->usuario('tecnico', ['cedula' => '222', 'sede' => 'OTRA SEDE']);
        WorkOrder::create(['numero_wo' => 'WO-X', 'numero_item' => '', 'cedula_tecnico' => '111', 'cedula_tecnico_agendado' => '222']);
        $this->actingAs($this->usuario('admin'));

        $wo = $this->getJson('/api/work-orders')->assertOk()->json()[0];
        $this->assertSame('ALIADO REAL', $wo['subagente_aliado_tecnico']);
    }

    public function test_la_migracion_corrige_las_cedulas_ya_guardadas_con_formato(): void
    {
        DB::table('work_orders')->insert([
            ['numero_wo' => 'A', 'numero_item' => '', 'cedula_tecnico' => '108529382 6', 'created_at' => now(), 'updated_at' => now()],
            ['numero_wo' => 'B', 'numero_item' => '', 'cedula_tecnico' => '1.085.293.826', 'created_at' => now(), 'updated_at' => now()],
            ['numero_wo' => 'C', 'numero_item' => '', 'cedula_tecnico' => '72243190', 'created_at' => now(), 'updated_at' => now()],
        ]);
        (require database_path('migrations/2026_10_31_000003_normalizar_cedulas_work_orders.php'))->up();

        $this->assertSame(['1085293826', '1085293826', '72243190'], WorkOrder::orderBy('numero_wo')->pluck('cedula_tecnico')->all());
    }
}
