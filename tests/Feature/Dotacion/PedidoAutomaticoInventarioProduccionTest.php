<?php

namespace Tests\Feature\Dotacion;

use App\Models\InventarioDotacion;
use App\Models\PedidoAutomatico;
use App\Models\Proyecto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * El pedido automático contra el inventario como está en producción (exportado el
 * 2026-11-10): cada proyecto tiene todo en una sede de Pereira, los nombres van en mayúsculas,
 * con "SYM" y con la talla de mujer en el nombre ("(10)"), con errores de escritura, y
 * SYM ADMINISTRATIVO no tiene nada. Los empleados son de Cali: el kit sale de la bodega.
 */
class PedidoAutomaticoInventarioProduccionTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private int $cedula = 77000000;

    private int $filasAntes;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake();
        Mail::fake();
        Cache::store('file')->forget(InventarioDotacion::CACHE_KEY_FLAT);
        $this->actuarComo('admin');

        $sedes = [
            'DIRECTV' => $this->sede('SERVIMERCADEO PEREIRA'),
            'SYM TIGO EXPRESS' => $this->sede('TIGO EXPRESS PEREIRA'),
            'SYM TIGO HOME' => $this->sede('TIGO HOME PEREIRA'),
        ];
        $this->sede('SYM PEREIRA');
        $cali = $this->sede('SERVIMERCADEO CALI');
        foreach (['DIRECTV', 'TIGO EXPRESS', 'TIGO HOME', 'ADMINISTRATIVO'] as $nombre) {
            Proyecto::firstOrCreate(['nombre' => $nombre], ['activo' => true])->sedes()->syncWithoutDetaching([$cali, ...array_values($sedes)]);
        }

        $inventario = [
            'DIRECTV' => [
                ['CAMISA COMERCIAL HOMBRE', 'Masculino', ['M' => 21, 'L' => 4, 'XXL' => 1]],
                ['CAMISA COMERCIAL DAMA', 'Femenino', ['10' => 10, '12' => 15]],
                ['PANTALON COMERCIAL HOMBRE', 'Masculino', ['32' => 2, '34' => 14]],
                ['PANTALON COMERCIAL DAMA', 'Femenino', ['8' => 14, '10' => 4]],
                ['POLO HOMBRE ADMON', 'Masculino', ['M' => 6]],
                ['POLO INSTALADOR MC', 'Masculino', ['S' => 4, 'XL' => 5]],
                ['POLO INSTALADOR ML', 'Masculino', ['M' => 4, 'XL' => 7]],
                ['PANTALON INSTLADOR', 'Masculino', ['32' => 18]],
                ['BOTAS TECNICO ISNTALADOR', 'Masculino', ['40' => 4]],
                ['RIATAS INSTALADOR', 'Masculino', ['N/A' => 13]],
                ['GORRAS DIRECTV', 'Masculino', ['N/A' => 14]],
                ['GORRAS  DIRECTV', 'Masculino', ['N/A' => 6]],
            ],
            'SYM TIGO EXPRESS' => [
                ['SYM CARNET', 'Femenino', ['N/A' => 97]],
                ['SYM CARNET', 'Masculino', ['N/A' => 97]],
                ['SYM POLO MC AZUL TIGO EXPRESS', 'Masculino', ['M' => 42, 'L' => 27]],
                ['SYM POLO MC AZUL TIGO EXPRESS (10)', 'Femenino', ['M' => 8]],
                ['SYM POLO MC BLANCA TIGO EXPRESS', 'Masculino', ['M' => 42, 'XXL' => 0]],
                ['SYM POLO MC BLANCA TIGO EXPRESS (10)', 'Femenino', ['M' => 15]],
            ],
            'SYM TIGO HOME' => [
                ['SYM CARNET', 'Masculino', ['N/A' => 99]],
                ['SYM GORRA TIGO', 'Masculino', ['N/A' => 50]],
                ['SYM GORRA TIGO', 'Femenino', ['N/A' => 47]],
                ['SYM POLO ML AZUL HOME', 'Masculino', ['M' => 36]],
                ['SYM POLO ML AZUL HOME (10)', 'Femenino', ['M' => 10]],
            ],
        ];
        foreach ($inventario as $proyecto => $prendas) {
            foreach ($prendas as [$prenda, $genero, $tallas]) {
                foreach ($tallas as $talla => $cantidad) {
                    InventarioDotacion::create([
                        'proyecto' => $proyecto, 'sede_id' => $sedes[$proyecto], 'prenda' => $prenda, 'genero' => $genero,
                        'talla' => (string) $talla, 'precio' => 0, 'cantidad' => $cantidad, 'stock_minimo' => 10,
                    ]);
                }
            }
        }
        $this->filasAntes = InventarioDotacion::count();
    }

    private function contrato(array $empleado, array $contrato, array $tallas = ['talla_camisa' => 'M', 'talla_pantalon' => '32', 'talla_zapatos' => '40'])
    {
        $user = $this->usuario('general', $empleado + ['cedula' => (string) ++$this->cedula, 'genero' => 'Masculino']);
        $this->formularioIngreso($user->cedula, $tallas);

        return $this->postJson('/api/contratos', $contrato + [
            'empleado_id' => $user->id, 'tipo_contrato' => 'Indefinido', 'cargo' => 'ASESOR COMERCIAL', 'sede' => 'SERVIMERCADEO CALI',
            'fecha_ingreso' => '2026-11-10', 'salario' => 2000000, 'estado_contrato' => 'Vigente', 'cliente_proyecto' => 'DIRECTV',
        ])->assertCreated();
    }

    /** "cantidad x PRENDA talla (por comprar)" de cada ítem del pedido. */
    private function kit($respuesta): array
    {
        $id = $respuesta->json('pedido_automatico.id');
        $this->assertNotNull($id, 'No se generó pedido: ' . $respuesta->json('pedido_automatico_motivo'));

        return PedidoAutomatico::findOrFail($id)->items()->with('inventario.sede')->get()
            ->map(fn ($i) => "{$i->cantidad} {$i->inventario->prenda} {$i->inventario->talla} ({$i->inventario->sede->nombre}, por comprar {$i->cantidad_por_comprar})")
            ->sort()->values()->all();
    }

    private function stock(string $prenda, string $talla): int
    {
        return (int) InventarioDotacion::where(['prenda' => $prenda, 'talla' => $talla])->sum('cantidad');
    }

    public function test_asesor_directv_hombre(): void
    {
        $kit = $this->kit($this->contrato([], []));

        $this->assertSame([
            '1 PANTALON COMERCIAL HOMBRE 32 (SERVIMERCADEO PEREIRA, por comprar 0)',
            '2 CAMISA COMERCIAL HOMBRE M (SERVIMERCADEO PEREIRA, por comprar 0)',
        ], $kit);
        $this->assertSame(19, $this->stock('CAMISA COMERCIAL HOMBRE', 'M'));
        $this->assertSame(1, $this->stock('PANTALON COMERCIAL HOMBRE', '32'));
    }

    public function test_asesora_directv_con_la_talla_de_mujer_en_numero(): void
    {
        $kit = $this->kit($this->contrato(['genero' => 'Femenino'], [], ['talla_camisa' => 'M', 'talla_pantalon' => '8']));

        $this->assertSame([
            '1 PANTALON COMERCIAL DAMA 8 (SERVIMERCADEO PEREIRA, por comprar 0)',
            '2 CAMISA COMERCIAL DAMA 10 (SERVIMERCADEO PEREIRA, por comprar 0)',
        ], $kit);
    }

    public function test_tecnico_directv_con_los_nombres_mal_escritos_de_produccion(): void
    {
        $kit = $this->kit($this->contrato([], ['cargo' => 'TECNICO SENIOR'], ['talla_camisa' => 'XL', 'talla_pantalon' => '32', 'talla_zapatos' => '40']));

        $this->assertSame([
            '1 BOTAS TECNICO ISNTALADOR 40 (SERVIMERCADEO PEREIRA, por comprar 0)',
            '1 GORRAS DIRECTV N/A (SERVIMERCADEO PEREIRA, por comprar 0)',
            '1 POLO INSTALADOR MC XL (SERVIMERCADEO PEREIRA, por comprar 0)',
            '1 POLO INSTALADOR ML XL (SERVIMERCADEO PEREIRA, por comprar 0)',
            '1 RIATAS INSTALADOR N/A (SERVIMERCADEO PEREIRA, por comprar 0)',
            '2 PANTALON INSTLADOR 32 (SERVIMERCADEO PEREIRA, por comprar 0)',
        ], $kit);
    }

    public function test_tigo_express_mujer_con_la_talla_en_el_nombre_de_la_prenda(): void
    {
        $kit = $this->kit($this->contrato(['genero' => 'Femenino'], ['cliente_proyecto' => 'TIGO EXPRESS']));

        $this->assertSame([
            '1 SYM CARNET N/A (TIGO EXPRESS PEREIRA, por comprar 0)',
            '1 SYM POLO MC AZUL TIGO EXPRESS (10) M (TIGO EXPRESS PEREIRA, por comprar 0)',
            '1 SYM POLO MC BLANCA TIGO EXPRESS (10) M (TIGO EXPRESS PEREIRA, por comprar 0)',
        ], $kit);
        $this->assertSame(7, $this->stock('SYM POLO MC AZUL TIGO EXPRESS (10)', 'M'));
    }

    public function test_tigo_home_asesor_con_gorra_y_carnet_de_su_propio_inventario(): void
    {
        $kit = $this->kit($this->contrato([], ['cliente_proyecto' => 'TIGO HOME']));

        $this->assertSame([
            '1 SYM CARNET N/A (TIGO HOME PEREIRA, por comprar 0)',
            '1 SYM GORRA TIGO N/A (TIGO HOME PEREIRA, por comprar 0)',
            '2 SYM POLO ML AZUL HOME M (TIGO HOME PEREIRA, por comprar 0)',
        ], $kit);
    }

    public function test_sin_stock_suficiente_descuenta_lo_que_hay_y_el_resto_queda_por_comprar(): void
    {
        // XXL de la polo blanca está en 0: entra entera por comprar, sin inventar nada.
        $kit = $this->kit($this->contrato([], ['cliente_proyecto' => 'TIGO EXPRESS'], ['talla_camisa' => 'XXL']));

        $this->assertContains('1 SYM POLO MC BLANCA TIGO EXPRESS XXL (TIGO EXPRESS PEREIRA, por comprar 1)', $kit);
        $this->assertSame($this->filasAntes, InventarioDotacion::count());
    }

    public function test_el_kit_administrativo_no_se_inventa(): void
    {
        $r = $this->contrato([], ['cliente_proyecto' => 'ADMINISTRATIVO', 'cargo' => 'ANALISTA'])
            ->assertJsonPath('pedido_automatico', null);

        $this->assertStringContainsString('no se maneja', $r->json('pedido_automatico_motivo'));
        $this->assertSame($this->filasAntes, InventarioDotacion::count(), 'No crea filas de prendas que no existen.');
    }

    public function test_ningun_kit_crea_filas_de_prendas_inexistentes(): void
    {
        foreach ([['DIRECTV', 'ASESOR COMERCIAL'], ['DIRECTV', 'TECNICO SENIOR'], ['DIRECTV', 'AUXILIAR DE LOGISTICA'],
            ['TIGO EXPRESS', 'ASESOR COMERCIAL'], ['TIGO EXPRESS', 'SUPERVISOR COMERCIAL'], ['TIGO HOME', 'ASESOR COMERCIAL'],
            ['TIGO HOME', 'SUPERVISOR COMERCIAL'], ['HUGHES COL', 'ANALISTA'], ['FT&H', 'ANALISTA']] as [$proyecto, $cargo]) {
            foreach (['Masculino', 'Femenino'] as $genero) {
                $this->contrato(['genero' => $genero], ['cliente_proyecto' => $proyecto, 'cargo' => $cargo]);
            }
        }

        $this->assertSame($this->filasAntes, InventarioDotacion::count(), 'Ningún pedido inventó prendas.');
        $this->assertSame(0, InventarioDotacion::where('cantidad', '<', 0)->count());
    }
}
