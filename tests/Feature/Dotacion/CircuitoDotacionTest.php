<?php

namespace Tests\Feature\Dotacion;

use App\Models\Contrato;
use App\Models\InventarioDotacion;
use App\Models\PedidoAutomatico;
use App\Models\PedidoGlobal;
use App\Models\Proyecto;
use App\Models\TrasladoDotacion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Todo el circuito de dotación, con las prendas y tallas del inventario real: el ingreso genera
 * el pedido automático, el inventario se carga (uno a uno, en bloque o por Excel), el pedido va
 * a Compras con su revisión de stock o traslado, se agrupa en un pedido global, se entrega y se
 * devuelve. El stock debe cuadrar en cada paso.
 */
class CircuitoDotacionTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private const SEDE = 'SEDE CAMPO';
    private const OTRA_SEDE = 'SEDE OTRA';

    private int $sedeId;
    private int $otraSedeId;
    private int $centralId;
    private int $cedula = 500000;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake();
        Mail::fake();
        Cache::store('file')->forget(InventarioDotacion::CACHE_KEY_FLAT);
        $this->actuarComo('admin');

        $this->centralId = $this->sede('SYM PEREIRA');
        $this->sedeId = $this->sede(self::SEDE);
        $this->otraSedeId = $this->sede(self::OTRA_SEDE);

        foreach (['DIRECTV', 'TIGO EXPRESS', 'TIGO HOME', 'ADMINISTRATIVO'] as $nombre) {
            Proyecto::firstOrCreate(['nombre' => $nombre], ['activo' => true])
                ->sedes()->syncWithoutDetaching([$this->centralId, $this->sedeId, $this->otraSedeId]);
        }

        $this->cargarInventario();
    }

    private function cargarInventario(): void
    {
        foreach (['Polo Instalador Azul Oscuro M/C' => ['M', 'XXL'], 'Polo Instalador Azul Oscuro M/L' => ['M', 'XXL'], 'Pantalon De Dril Tecnicos' => ['32'],
            'Botas Instalador' => ['40'], 'Reata Azul Oscuro' => ['N/A'], 'Gorra' => ['N/A'], 'Carnet' => ['N/A']] as $prenda => $tallas) {
            foreach ($tallas as $talla) {
                $this->prenda('DIRECTV', $prenda, 'Masculino', $talla);
            }
        }
        foreach (['Masculino' => ['M', '2XL', '32'], 'Femenino' => ['M', '2XL', '8']] as $genero => [$m, $xxl, $pantalon]) {
            $this->prenda('DIRECTV', 'Polo Gris Administrativa', $genero, $m);
            $this->prenda('DIRECTV', 'Polo Gris Administrativa', $genero, $xxl);
            $this->prenda('DIRECTV', 'Pantalon Comercial', $genero, $pantalon);
            $this->prenda('SYM ADMINISTRATIVO', 'Polo Gris Manga Corta', $genero, $m, $this->centralId);
            $this->prenda('SYM ADMINISTRATIVO', 'Jean Azul', $genero, $pantalon, $this->centralId);
        }
        foreach (['Polo Mc Azul Tigo Express', 'Polo Mc Blanca Tigo Express'] as $polo) {
            foreach (['M', '2XL', 'S'] as $talla) {
                $this->prenda('SYM TIGO EXPRESS', $polo, 'Masculino', $talla);
            }
            foreach (['10 (M)', '16 (2XL)', '8 (S)'] as $talla) {
                $this->prenda('SYM TIGO EXPRESS', $polo, 'Femenino', $talla);
            }
        }
        $this->prenda('SYM TIGO HOME', 'Polo Ml Azul Home', 'Masculino', 'M');
        $this->prenda('SYM TIGO HOME', 'Polo Ml Azul Home', 'Femenino', '10 (M)');
        $this->prenda('SYM ADMINISTRATIVO', 'Carnet', 'Masculino', 'N/A', $this->centralId);
        $this->prenda('SYM ADMINISTRATIVO', 'Gorra Tigo', 'Masculino', 'N/A', $this->centralId);
    }

    private function prenda(string $proyecto, string $prenda, string $genero, string $talla, ?int $sedeId = null, int $cantidad = 10): InventarioDotacion
    {
        return InventarioDotacion::updateOrCreate(
            ['proyecto' => $proyecto, 'sede_id' => $sedeId ?? $this->sedeId, 'prenda' => $prenda, 'genero' => $genero, 'talla' => $talla],
            ['precio' => 1000, 'cantidad' => $cantidad, 'stock_minimo' => 0],
        );
    }

    private function fila(string $proyecto, string $prenda, string $genero, string $talla, ?int $sedeId = null): InventarioDotacion
    {
        return InventarioDotacion::where(['proyecto' => $proyecto, 'sede_id' => $sedeId ?? $this->sedeId, 'prenda' => $prenda, 'genero' => $genero, 'talla' => $talla])->firstOrFail();
    }

    private function empleado(array $datos = [], bool $conFormulario = true, array $tallasFormulario = []): User
    {
        $empleado = $this->usuario('general', $datos + ['cedula' => (string) ++$this->cedula, 'genero' => 'Masculino']);
        if ($conFormulario) {
            $this->formularioIngreso($empleado->cedula, $tallasFormulario);
        }

        return $empleado;
    }

    private function datosContrato(User $empleado, array $extra = []): array
    {
        return $extra + [
            'empleado_id' => $empleado->id, 'tipo_contrato' => 'Indefinido', 'cargo' => 'ASESOR COMERCIAL', 'sede' => self::SEDE,
            'fecha_ingreso' => '2026-11-01', 'salario' => 2000000, 'estado_contrato' => 'Vigente', 'cliente_proyecto' => 'DIRECTV',
        ];
    }

    private function contrato(User $empleado, array $extra = [])
    {
        return $this->postJson('/api/contratos', $this->datosContrato($empleado, $extra))->assertCreated();
    }

    private function pedidoDe($respuesta): PedidoAutomatico
    {
        $id = $respuesta->json('pedido_automatico.id');
        $this->assertNotNull($id, 'No se generó pedido: ' . $respuesta->json('pedido_automatico_motivo'));

        return PedidoAutomatico::findOrFail($id);
    }

    /** Las prendas del pedido como "cantidad x prenda (proyecto, género, talla)". */
    private function prendasDe(PedidoAutomatico $pedido): array
    {
        return $pedido->items()->with('inventario')->get()
            ->map(fn ($i) => "{$i->cantidad} {$i->inventario->prenda} {$i->inventario->genero} {$i->inventario->talla}")
            ->sort()->values()->all();
    }

    private function nombresDePrendas(PedidoAutomatico $pedido): array
    {
        return $pedido->items()->with('inventario')->get()->pluck('inventario.prenda')->sort()->values()->all();
    }

    private function itemsDe(PedidoAutomatico $pedido): array
    {
        return $pedido->items()->get(['inventario_dotacion_id', 'cantidad'])
            ->map(fn ($i) => ['inventario_dotacion_id' => $i->inventario_dotacion_id, 'cantidad' => $i->cantidad])->all();
    }

    private const KIT_TECNICO = ['Botas Instalador', 'Carnet', 'Gorra', 'Pantalon De Dril Tecnicos', 'Polo Instalador Azul Oscuro M/C', 'Polo Instalador Azul Oscuro M/L', 'Reata Azul Oscuro'];
    private const KIT_ASESOR_DTV = ['Carnet', 'Pantalon Comercial', 'Polo Gris Administrativa'];
    private const KIT_LOGISTICA = ['Botas Instalador', 'Carnet', 'Pantalon Comercial', 'Polo Gris Administrativa'];
    private const KIT_ADMIN = ['Carnet', 'Jean Azul', 'Polo Gris Manga Corta'];
    private const KIT_EXPRESS = ['Carnet', 'Polo Mc Azul Tigo Express', 'Polo Mc Blanca Tigo Express'];
    private const KIT_HOME = ['Carnet', 'Gorra Tigo', 'Polo Ml Azul Home'];

    // ── Cuándo se genera ─────────────────────────────────────────────────────

    public function test_sin_formulario_de_ingreso_no_hay_pedido_aunque_tenga_tallas_en_su_ficha(): void
    {
        $empleado = $this->empleado(['talla_camisa' => 'M', 'talla_pantalon' => '32'], conFormulario: false);
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $this->contrato($empleado)->assertJsonPath('pedido_automatico', null)
            ->assertJsonPath('pedido_automatico_motivo', fn ($m) => str_contains($m, 'formulario de ingreso'));

        $this->assertSame(10, $polo->fresh()->cantidad);
        $this->assertDatabaseCount('pedidos_automaticos', 0);
    }

    public function test_un_segundo_contrato_no_da_otro_kit(): void
    {
        $empleado = $this->empleado();
        $this->pedidoDe($this->contrato($empleado));
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $this->assertSame(8, $polo->fresh()->cantidad);

        $this->contrato($empleado)->assertJsonPath('pedido_automatico', null)
            ->assertJsonPath('pedido_automatico_motivo', fn ($m) => str_contains($m, 'ya tuvo otro contrato') && str_contains($m, 'manualmente'));

        $this->assertSame(8, $polo->fresh()->cantidad);
        $this->assertSame(1, PedidoAutomatico::where('empleado_id', $empleado->id)->count());
    }

    public function test_con_un_segundo_contrato_el_kit_se_puede_crear_manualmente(): void
    {
        $empleado = $this->empleado();
        $this->contrato($empleado);
        $this->contrato($empleado);
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $this->postJson('/api/pedidos-automaticos', [
            'empleado_id' => $empleado->id, 'items' => [['inventario_dotacion_id' => $polo->id, 'cantidad' => 1]],
        ])->assertCreated();

        $this->assertSame(7, $polo->fresh()->cantidad);
        $this->assertSame(2, PedidoAutomatico::where('empleado_id', $empleado->id)->count());
    }

    public function test_quien_nunca_ingreso_si_recibe_su_kit_en_el_contrato_real(): void
    {
        $empleado = $this->empleado();
        $this->contrato($empleado, ['estado_contrato' => 'No ingreso'])->assertJsonPath('pedido_automatico', null);

        $this->pedidoDe($this->contrato($empleado));
    }

    public function test_un_contrato_finalizado_no_genera_pedido_ni_descuenta_stock(): void
    {
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $this->contrato($this->empleado(), ['estado_contrato' => 'Finalizado'])
            ->assertJsonPath('pedido_automatico', null)
            ->assertJsonPath('pedido_automatico_motivo', fn ($m) => str_contains($m, 'Finalizado'));

        $this->assertSame(10, $polo->fresh()->cantidad);
    }

    // ── Qué kit recibe cada quien ────────────────────────────────────────────

    public static function kitsPorProyectoYCargo(): array
    {
        return [
            'DIRECTV técnico (AUX)'          => ['DIRECTV', 'TECNICO DE INSTALACIONES (AUX)', self::KIT_TECNICO],
            'DIRECTV técnico con tilde'      => ['DIRECTV', 'TÉCNICO DE INSTALACIONES', self::KIT_TECNICO],
            'DIRECTV técnico en campo'       => ['DIRECTV', 'TECNICO AUXILIAR EN CAMPO', self::KIT_TECNICO],
            'DIRECTV técnico en alturas'     => ['DIRECTV', 'AUXILIAR TECNICO EN ALTURAS', self::KIT_TECNICO],
            'DIRECTV técnico senior'         => ['DIRECTV', 'TECNICO SENIOR', self::KIT_TECNICO],
            'DIRECTV auxiliar técnico'       => ['DIRECTV', 'AUXILIAR TECNICO', self::KIT_TECNICO],
            'DIRECTV asesor'                 => ['DIRECTV', 'ASESOR COMERCIAL', self::KIT_ASESOR_DTV],
            'DIRECTV analista'               => ['DIRECTV', 'ANALISTA OPERATIVO', self::KIT_ASESOR_DTV],
            'DIRECTV auxiliar de sistemas'   => ['DIRECTV', 'AUXILIAR DE SISTEMAS', self::KIT_ASESOR_DTV],
            'DIRECTV supervisor técnico'     => ['DIRECTV', 'SUPERVISOR TECNICO', self::KIT_ASESOR_DTV],
            'DIRECTV técnico en sistemas'    => ['DIRECTV', 'TECNICO EN SISTEMAS', self::KIT_ASESOR_DTV],
            'DIRECTV logística'              => ['DIRECTV', 'AUXILIAR DE LOGISTICA', self::KIT_LOGISTICA],
            'DIRECTV logística con tilde'    => ['DIRECTV', 'TORRE DE CONTROL INTEGRAL LOGÍSTICA', self::KIT_LOGISTICA],
            'DIRECTV nombre viejo'           => ['DIRECTV CO', 'ASESOR COMERCIAL', self::KIT_ASESOR_DTV],
            'HUGHES técnico'                 => ['HUGHES COL', 'TECNICO DE INSTALACIONES (AUX)', self::KIT_TECNICO],
            'HUGHES otro cargo'              => ['HUGHES COL', 'ANALISTA DE DATOS', self::KIT_TECNICO],
            'FT&H técnico'                   => ['FT&H', 'TECNICO SENIOR', self::KIT_TECNICO],
            'FT&H otro cargo'                => ['FT&H', 'ASESOR COMERCIAL', self::KIT_TECNICO],
            'Tigo Express asesor'            => ['TIGO EXPRESS', 'ASESOR COMERCIAL', self::KIT_EXPRESS],
            'Tigo Express supervisor'        => ['TIGO EXPRESS', 'SUPERVISOR COMERCIAL', self::KIT_EXPRESS],
            'Tigo Express analista'          => ['TIGO EXPRESS', 'ANALISTA DE DATOS', self::KIT_ADMIN],
            'Tigo Home asesor'               => ['TIGO HOME', 'ASESOR COMERCIAL', self::KIT_HOME],
            'Tigo Home supervisor'           => ['TIGO HOME', 'SUPERVISOR COMERCIAL', ['Carnet', 'Polo Ml Azul Home']],
            'Tigo Home analista'             => ['TIGO HOME', 'ANALISTA DE DATOS', self::KIT_ADMIN],
            'Administrativo'                 => ['ADMINISTRATIVO', 'BACKOFFICE', self::KIT_ADMIN],
            'Otro proyecto'                  => ['S&M ASESORES', 'ASESOR COMERCIAL', self::KIT_ADMIN],
        ];
    }

    #[DataProvider('kitsPorProyectoYCargo')]
    public function test_cada_proyecto_y_cargo_recibe_su_kit_completo(string $proyecto, string $cargo, array $kit): void
    {
        $r = $this->contrato($this->empleado(), ['cliente_proyecto' => $proyecto, 'cargo' => $cargo]);

        $this->assertSame($kit, $this->nombresDePrendas($this->pedidoDe($r)));
        $this->assertSame([], $r->json('pedido_automatico_faltantes'));
    }

    public function test_el_kit_de_hughes_sale_del_inventario_de_directv_de_su_sede(): void
    {
        $botas = $this->fila('DIRECTV', 'Botas Instalador', 'Masculino', '40');
        $pantalon = $this->fila('DIRECTV', 'Pantalon De Dril Tecnicos', 'Masculino', '32');

        $this->pedidoDe($this->contrato($this->empleado(), ['cliente_proyecto' => 'HUGHES COL', 'cargo' => 'ANALISTA DE DATOS']));

        $this->assertSame(9, $botas->fresh()->cantidad);
        $this->assertSame(8, $pantalon->fresh()->cantidad, 'El kit de técnico lleva 2 pantalones.');
    }

    public function test_el_pedido_de_hughes_se_puede_editar_con_sus_prendas(): void
    {
        $empleado = $this->empleado();
        $pedido = $this->pedidoDe($this->contrato($empleado, ['cliente_proyecto' => 'FT&H']));

        $this->putJson("/api/pedidos-automaticos/{$pedido->id}", ['empleado_id' => $empleado->id, 'estado' => 'Completado', 'items' => $this->itemsDe($pedido)])->assertOk();
    }

    public function test_una_sede_sin_inventario_del_proyecto_recibe_el_pedido_todo_por_comprar(): void
    {
        $sede = $this->sede('SEDE SIN STOCK');

        $r = $this->contrato($this->empleado(), ['cliente_proyecto' => 'HUGHES COL', 'sede' => 'SEDE SIN STOCK']);

        $pedido = $this->pedidoDe($r);
        $this->assertSame(self::KIT_TECNICO, $this->nombresDePrendas($pedido));
        $this->assertSame(0, (int) $pedido->items()->get()->sum(fn ($i) => $i->cantidadEnStock()));
        // Quedan las filas en 0, con la talla y el precio que la prenda ya usa en otra sede.
        $botas = $this->fila('DIRECTV', 'Botas Instalador', 'Masculino', '40', $sede);
        $this->assertSame(0, $botas->cantidad);
        $this->assertSame(1000, $botas->precio);
    }

    public function test_una_sede_inexistente_solo_asigna_lo_de_la_sede_central(): void
    {
        $r = $this->contrato($this->empleado(), ['cliente_proyecto' => 'TIGO EXPRESS', 'sede' => 'NO EXISTE']);

        $this->assertSame(['Carnet'], $this->nombresDePrendas($this->pedidoDe($r)));
        $r->assertJsonPath('pedido_automatico_faltantes.0', fn ($f) => str_contains($f, 'sin sede'));
    }

    // ── Tallas y género ──────────────────────────────────────────────────────

    public static function tallasDelFormulario(): array
    {
        return [
            'mujer M en Tigo'      => ['Femenino', 'M', 'TIGO EXPRESS', 'Polo Mc Azul Tigo Express', '10 (M)'],
            'mujer S en Tigo'      => ['Femenino', 'S', 'TIGO EXPRESS', 'Polo Mc Blanca Tigo Express', '8 (S)'],
            'mujer XXL en Tigo'    => ['Femenino', 'XXL', 'TIGO EXPRESS', 'Polo Mc Azul Tigo Express', '16 (2XL)'],
            'mujer M en Tigo Home' => ['Femenino', 'M', 'TIGO HOME', 'Polo Ml Azul Home', '10 (M)'],
            'hombre M en Tigo'     => ['Masculino', 'M', 'TIGO EXPRESS', 'Polo Mc Azul Tigo Express', 'M'],
            'hombre XXL en Tigo'   => ['Masculino', 'XXL', 'TIGO EXPRESS', 'Polo Mc Azul Tigo Express', '2XL'],
            'hombre XXL en DTV'    => ['Masculino', 'XXL', 'DIRECTV', 'Polo Gris Administrativa', '2XL'],
            'mujer XXL en DTV'     => ['Femenino', 'XXL', 'DIRECTV', 'Polo Gris Administrativa', '2XL'],
        ];
    }

    #[DataProvider('tallasDelFormulario')]
    public function test_la_talla_del_formulario_encuentra_la_del_inventario(string $genero, string $camisa, string $proyecto, string $prenda, string $esperada): void
    {
        $empleado = $this->empleado(['genero' => $genero], tallasFormulario: ['talla_camisa' => $camisa, 'talla_pantalon' => $genero === 'Femenino' ? '8' : '32']);

        $r = $this->contrato($empleado, ['cliente_proyecto' => $proyecto]);
        $items = $this->pedidoDe($r)->items()->with('inventario')->get()->pluck('inventario');

        $this->assertSame($esperada, $items->firstWhere('prenda', $prenda)?->talla, json_encode($r->json('pedido_automatico_faltantes')));
    }

    public function test_el_instalador_con_xxl_recibe_la_talla_xxl_de_su_inventario(): void
    {
        $r = $this->contrato($this->empleado(tallasFormulario: ['talla_camisa' => 'XXL']), ['cargo' => 'TECNICO SENIOR']);

        $tallas = $this->pedidoDe($r)->items()->with('inventario')->get()->pluck('inventario.talla', 'inventario.prenda');
        $this->assertSame('XXL', $tallas['Polo Instalador Azul Oscuro M/C']);
    }

    public function test_una_talla_que_no_existe_entra_por_comprar(): void
    {
        // XS de hombre: no existe en los polos de Tigo, ni con otro nombre.
        $r = $this->contrato($this->empleado(tallasFormulario: ['talla_camisa' => 'XS']), ['cliente_proyecto' => 'TIGO EXPRESS']);

        $pedido = $this->pedidoDe($r);
        $this->assertSame(self::KIT_EXPRESS, $this->nombresDePrendas($pedido));
        $r->assertJsonPath('pedido_automatico_faltantes.0', fn ($f) => str_contains($f, 'talla XS') && str_contains($f, 'por comprar 1'));
        $this->assertSame(0, $this->fila('SYM TIGO EXPRESS', 'Polo Mc Azul Tigo Express', 'Masculino', 'XS')->cantidad);
    }

    public function test_la_mujer_con_talla_sin_fila_en_su_sede_usa_el_nombre_de_talla_del_inventario(): void
    {
        $sede = $this->sede('SEDE NUEVA TIGO');

        $this->pedidoDe($this->contrato($this->empleado(['genero' => 'Femenino']), ['cliente_proyecto' => 'TIGO EXPRESS', 'sede' => 'SEDE NUEVA TIGO']));

        $this->assertSame(0, $this->fila('SYM TIGO EXPRESS', 'Polo Mc Azul Tigo Express', 'Femenino', '10 (M)', $sede)->cantidad);
    }

    public function test_sin_stock_en_la_talla_equivalente_se_reporta_cuanto_hay(): void
    {
        $this->prenda('SYM TIGO EXPRESS', 'Polo Mc Azul Tigo Express', 'Femenino', '10 (M)', cantidad: 0);

        $r = $this->contrato($this->empleado(['genero' => 'Femenino']), ['cliente_proyecto' => 'TIGO EXPRESS']);

        $r->assertJsonPath('pedido_automatico_faltantes.0', fn ($f) => str_contains($f, 'Polo Mc Azul') && str_contains($f, 'hay 0'));
    }

    public static function generosSinPrendas(): array
    {
        return ['vacío' => [null], 'otro' => ['Otro'], 'no binario' => ['No binario']];
    }

    #[DataProvider('generosSinPrendas')]
    public function test_sin_genero_no_se_asigna_ropa_de_hombre_y_se_avisa(?string $genero): void
    {
        $empleado = $this->empleado();
        $empleado->forceFill(['genero' => $genero])->saveQuietly();
        $polo = $this->fila('SYM TIGO EXPRESS', 'Polo Mc Azul Tigo Express', 'Masculino', 'M');

        $r = $this->contrato($empleado, ['cliente_proyecto' => 'TIGO EXPRESS']);

        $this->assertSame(['Carnet'], $this->nombresDePrendas($this->pedidoDe($r)));
        $r->assertJsonPath('pedido_automatico_faltantes.0', fn ($f) => str_contains($f, 'género'));
        $this->assertSame(10, $polo->fresh()->cantidad);
    }

    public function test_el_tecnico_sin_genero_si_recibe_su_kit_porque_es_unico(): void
    {
        $empleado = $this->empleado();
        $empleado->forceFill(['genero' => null])->saveQuietly();

        $this->assertSame(self::KIT_TECNICO, $this->nombresDePrendas($this->pedidoDe($this->contrato($empleado, ['cargo' => 'TECNICO SENIOR']))));
    }

    public function test_la_talla_de_la_ficha_manda_y_lo_que_falta_sale_del_formulario(): void
    {
        $empleado = $this->empleado(['talla_camisa' => 'S'], tallasFormulario: ['talla_camisa' => 'M']);

        $r = $this->contrato($empleado, ['cliente_proyecto' => 'TIGO EXPRESS']);

        $tallas = $this->pedidoDe($r)->items()->with('inventario')->get()->pluck('inventario.talla')->all();
        $this->assertContains('S', $tallas);
        $this->assertNotContains('M', $tallas);
    }

    public function test_un_pedido_manual_queda_ligado_al_contrato_vigente_del_empleado(): void
    {
        $empleado = $this->empleado();
        $vigente = $this->contrato($empleado)->json('id');
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $id = $this->postJson('/api/pedidos-automaticos', ['empleado_id' => $empleado->id, 'items' => [['inventario_dotacion_id' => $polo->id, 'cantidad' => 1]]])
            ->assertCreated()->assertJsonPath('contrato_id', $vigente)->json('id');

        $this->assertSame($vigente, PedidoAutomatico::find($id)->contrato_id);
    }

    public function test_un_ingreso_nuevo_por_documento_genera_su_pedido_quedando_pendiente_de_alta(): void
    {
        $this->formularioIngreso('77001122', ['talla_camisa' => 'M']);
        $this->filaCompleta('candidatos', ['identificacion' => '77001122', 'genero' => 'Femenino', 'created_at' => now(), 'updated_at' => now()]);

        $r = $this->postJson('/api/contratos', [
            'documento' => '77001122', 'nombres' => 'ANA', 'apellidos' => 'RUIZ', 'tipo_contrato' => 'Indefinido', 'cargo' => 'ASESOR COMERCIAL',
            'sede' => self::SEDE, 'fecha_ingreso' => '2026-11-01', 'salario' => 2000000, 'estado_contrato' => 'Vigente', 'cliente_proyecto' => 'TIGO EXPRESS',
        ])->assertCreated();

        $this->assertSame(self::KIT_EXPRESS, $this->nombresDePrendas($this->pedidoDe($r)));
        $empleado = User::where('cedula', '77001122')->first();
        $this->assertTrue((bool) $empleado->pendiente_alta);
        $this->assertSame(9, $this->fila('SYM TIGO EXPRESS', 'Polo Mc Azul Tigo Express', 'Femenino', '10 (M)')->cantidad);
    }

    // ── Editar el pedido automático ──────────────────────────────────────────

    public static function kitsQueMezclanInventarios(): array
    {
        return [
            'asesor Tigo Express'     => ['TIGO EXPRESS', 'ASESOR COMERCIAL'],
            'analista Tigo Express'   => ['TIGO EXPRESS', 'ANALISTA DE DATOS'],
            'asesor Tigo Home'        => ['TIGO HOME', 'ASESOR COMERCIAL'],
            'supervisor Tigo Home'    => ['TIGO HOME', 'SUPERVISOR COMERCIAL'],
        ];
    }

    #[DataProvider('kitsQueMezclanInventarios')]
    public function test_el_pedido_automatico_se_puede_completar_desde_el_formulario(string $proyecto, string $cargo): void
    {
        $empleado = $this->empleado();
        $pedido = $this->pedidoDe($this->contrato($empleado, ['cliente_proyecto' => $proyecto, 'cargo' => $cargo]));
        $antes = $this->prendasDe($pedido);

        $this->putJson("/api/pedidos-automaticos/{$pedido->id}", [
            'empleado_id' => $empleado->id, 'contrato_id' => $pedido->contrato_id, 'estado' => 'Completado', 'items' => $this->itemsDe($pedido),
        ])->assertOk()->assertJsonPath('estado', 'Completado');

        $this->assertSame($antes, $this->prendasDe($pedido->fresh()));
    }

    public function test_el_supervisor_de_tigo_home_lleva_2_polos_de_home_y_no_de_express(): void
    {
        $empleado = $this->empleado();
        $home = $this->fila('SYM TIGO HOME', 'Polo Ml Azul Home', 'Masculino', 'M');
        $express = $this->fila('SYM TIGO EXPRESS', 'Polo Mc Azul Tigo Express', 'Masculino', 'M');

        $this->pedidoDe($this->contrato($empleado, ['cliente_proyecto' => 'TIGO HOME', 'cargo' => 'SUPERVISOR COMERCIAL']));

        $this->assertSame(8, $home->fresh()->cantidad);
        $this->assertSame(10, $express->fresh()->cantidad);
        // Tampoco se le pueden asignar a mano.
        $this->postJson('/api/pedidos-automaticos', [
            'empleado_id' => $empleado->id, 'items' => [['inventario_dotacion_id' => $express->id, 'cantidad' => 1]],
        ])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'No corresponden'));
    }

    public function test_cambiar_la_sede_o_el_cargo_del_contrato_no_modifica_el_pedido(): void
    {
        $empleado = $this->empleado();
        $r = $this->contrato($empleado);
        $pedido = $this->pedidoDe($r);
        $antes = $this->itemsDe($pedido);

        $this->putJson('/api/contratos/' . $r->json('id'), $this->datosContrato($empleado, ['sede' => self::OTRA_SEDE, 'cargo' => 'TECNICO SENIOR']))->assertOk()
            ->assertJsonPath('pedido_automatico_aviso', null);

        $this->assertSame($antes, $this->itemsDe($pedido->fresh()));
    }

    public function test_un_contrato_de_traslado_posterior_no_da_otro_kit(): void
    {
        $empleado = $this->empleado();
        $this->pedidoDe($this->contrato($empleado));

        $this->contrato($empleado, ['estado_contrato' => 'Traslado'])->assertJsonPath('pedido_automatico', null);

        $this->assertSame(1, PedidoAutomatico::where('empleado_id', $empleado->id)->count());
    }

    public function test_sigue_sin_poderse_asignar_dotacion_de_otro_negocio(): void
    {
        $empleado = $this->empleado();
        $this->contrato($empleado, ['cliente_proyecto' => 'TIGO EXPRESS']);
        $poloDtv = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $this->postJson('/api/pedidos-automaticos', [
            'empleado_id' => $empleado->id, 'items' => [['inventario_dotacion_id' => $poloDtv->id, 'cantidad' => 1]],
        ])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'No corresponden'));

        $this->assertSame(10, $poloDtv->fresh()->cantidad);
    }

    // ── Cambio de proyecto del contrato ──────────────────────────────────────

    private function cambiarContrato(User $empleado, int $contratoId, array $extra)
    {
        return $this->putJson("/api/contratos/{$contratoId}", $this->datosContrato($empleado, $extra))->assertOk();
    }

    public function test_al_cambiar_el_proyecto_el_pedido_se_rehace_y_el_stock_cuadra(): void
    {
        $empleado = $this->empleado();
        $r = $this->contrato($empleado, ['cliente_proyecto' => 'TIGO EXPRESS']);
        $pedido = $this->pedidoDe($r);
        $poloTigo = $this->fila('SYM TIGO EXPRESS', 'Polo Mc Azul Tigo Express', 'Masculino', 'M');
        $carnetAdmin = $this->fila('SYM ADMINISTRATIVO', 'Carnet', 'Masculino', 'N/A', $this->centralId);
        $poloDtv = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $this->assertSame(9, $poloTigo->fresh()->cantidad);

        $c = $this->cambiarContrato($empleado, $r->json('id'), ['cliente_proyecto' => 'DIRECTV']);

        $c->assertJsonPath('pedido_automatico_aviso', fn ($a) => str_contains($a, 'se actualizó') && str_contains($a, 'DIRECTV'));
        $this->assertSame(self::KIT_ASESOR_DTV, $this->nombresDePrendas($pedido->fresh()));
        $this->assertSame($pedido->codigo, $pedido->fresh()->codigo, 'Es el mismo pedido.');
        $this->assertSame(10, $poloTigo->fresh()->cantidad);
        $this->assertSame(10, $carnetAdmin->fresh()->cantidad);
        $this->assertSame(8, $poloDtv->fresh()->cantidad);
        $this->assertSame(1, PedidoAutomatico::where('contrato_id', $r->json('id'))->count());
    }

    public function test_editar_el_contrato_sin_cambiar_el_proyecto_no_toca_el_pedido(): void
    {
        $empleado = $this->empleado();
        $r = $this->contrato($empleado);
        $pedido = $this->pedidoDe($r);
        $items = $pedido->items()->pluck('id')->all();

        $this->cambiarContrato($empleado, $r->json('id'), ['salario' => 2500000, 'cliente_proyecto' => 'directv'])
            ->assertJsonPath('pedido_automatico_aviso', null);
        // El nombre viejo del mismo proyecto tampoco es un cambio.
        $this->cambiarContrato($empleado, $r->json('id'), ['cliente_proyecto' => 'DIRECTV CO'])
            ->assertJsonPath('pedido_automatico_aviso', null);

        $this->assertSame($items, $pedido->items()->pluck('id')->all());
        $this->assertSame(8, $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M')->cantidad);
    }

    public static function pedidosQueNoSeTocan(): array
    {
        return ['entregado' => ['Completado'], 'en compras' => ['Enviar a compras'], 'devuelto' => ['Devolución']];
    }

    #[DataProvider('pedidosQueNoSeTocan')]
    public function test_un_pedido_ya_avanzado_no_se_cambia_y_se_avisa(string $estado): void
    {
        $empleado = $this->empleado();
        $r = $this->contrato($empleado);
        $pedido = $this->pedidoDe($r);
        $pedido->cambiarEstado($estado);
        $prendas = $this->prendasDe($pedido->fresh());

        $this->cambiarContrato($empleado, $r->json('id'), ['cliente_proyecto' => 'TIGO EXPRESS'])
            ->assertJsonPath('pedido_automatico_aviso', fn ($a) => str_contains($a, $estado) && str_contains($a, 'manualmente'));

        $this->assertSame($prendas, $this->prendasDe($pedido->fresh()));
    }

    public function test_un_pedido_manual_no_se_cambia_con_el_proyecto(): void
    {
        $empleado = $this->empleado();
        $r = $this->contrato($empleado, ['estado_contrato' => 'Vigente']);
        $this->pedidoDe($r)->cambiarEstado('Cancelado');
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $manual = $this->postJson('/api/pedidos-automaticos', [
            'empleado_id' => $empleado->id, 'contrato_id' => $r->json('id'), 'items' => [['inventario_dotacion_id' => $polo->id, 'cantidad' => 3]],
        ])->assertCreated()->json('id');

        $this->cambiarContrato($empleado, $r->json('id'), ['cliente_proyecto' => 'TIGO EXPRESS']);

        $this->assertSame(['3 Polo Gris Administrativa Masculino M'], $this->prendasDe(PedidoAutomatico::find($manual)));
        $this->assertSame(7, $polo->fresh()->cantidad);
    }

    public function test_si_el_proyecto_nuevo_no_tiene_stock_el_pedido_queda_por_comprar_y_devuelve_el_anterior(): void
    {
        $empleado = $this->empleado();
        $r = $this->contrato($empleado);
        $pedido = $this->pedidoDe($r);
        $this->prenda('SYM TIGO EXPRESS', 'Polo Mc Azul Tigo Express', 'Masculino', 'M', cantidad: 0);
        $this->prenda('SYM TIGO EXPRESS', 'Polo Mc Blanca Tigo Express', 'Masculino', 'M', cantidad: 0);
        $this->prenda('SYM ADMINISTRATIVO', 'Carnet', 'Masculino', 'N/A', $this->centralId, cantidad: 0);

        $this->cambiarContrato($empleado, $r->json('id'), ['cliente_proyecto' => 'TIGO EXPRESS'])
            ->assertJsonPath('pedido_automatico_aviso', fn ($a) => str_contains($a, 'se actualizó') && str_contains($a, 'por comprar'));

        $this->assertSame(self::KIT_EXPRESS, $this->nombresDePrendas($pedido->fresh()));
        $this->assertSame(0, (int) $pedido->items()->get()->sum(fn ($i) => $i->cantidadEnStock()));
        $this->assertSame(10, $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M')->cantidad);
    }

    public function test_si_ya_no_se_puede_asignar_nada_el_pedido_se_elimina_y_devuelve_el_stock(): void
    {
        $empleado = $this->empleado();
        $r = $this->contrato($empleado);
        $pedido = $this->pedidoDe($r);
        DB::table('sedes')->where('id', $this->centralId)->update(['nombre' => 'SEDE RENOMBRADA']);

        $this->cambiarContrato($empleado, $r->json('id'), ['cliente_proyecto' => 'TIGO EXPRESS'])
            ->assertJsonPath('pedido_automatico_aviso', fn ($a) => str_contains($a, 'se eliminó'));

        $this->assertDatabaseMissing('pedidos_automaticos', ['id' => $pedido->id]);
        $this->assertSame(10, $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M')->cantidad);
    }

    // ── Pasar el contrato a "No ingreso" ─────────────────────────────────────

    public static function estadosAlPasarANoIngreso(): array
    {
        return [
            'en proceso'       => ['Activo', 10],
            'pendiente'        => ['Pendiente', 10],
            'completado'       => ['Completado', 10],
            'enviar a compras' => ['Enviar a compras', 10],
            'devolución'       => ['Devolución', 10],
            'devolución usada' => ['Devolución usada', 8],
        ];
    }

    #[DataProvider('estadosAlPasarANoIngreso')]
    public function test_pasar_a_no_ingreso_devuelve_el_stock_que_corresponde(string $estado, int $stockFinal): void
    {
        $empleado = $this->empleado();
        $r = $this->contrato($empleado);
        $pedido = $this->pedidoDe($r);
        $pedido->cambiarEstado($estado);

        $this->cambiarContrato($empleado, $r->json('id'), ['estado_contrato' => 'No ingreso']);

        $this->assertDatabaseMissing('pedidos_automaticos', ['id' => $pedido->id]);
        $this->assertSame($stockFinal, $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M')->cantidad);
    }

    // ── Inventario: crear uno, en bloque, importar, exportar ─────────────────

    private function datosItem(array $extra = []): array
    {
        return $extra + [
            'proyecto' => 'DIRECTV', 'sede_id' => $this->sedeId, 'prenda' => 'Chaqueta Nueva', 'genero' => 'Femenino',
            'talla' => 'M', 'precio' => 50000, 'cantidad' => 7, 'stock_minimo' => 2,
        ];
    }

    public function test_crear_un_solo_item_de_inventario(): void
    {
        $this->postJson('/api/inventario-dotacion', $this->datosItem())->assertCreated()->assertJsonPath('cantidad', 7);

        $this->assertDatabaseHas('inventario_dotacion', ['prenda' => 'Chaqueta Nueva', 'genero' => 'Femenino', 'sede_id' => $this->sedeId, 'cantidad' => 7, 'precio' => 50000]);
    }

    public function test_crear_de_nuevo_el_mismo_item_lo_actualiza_sin_duplicarlo(): void
    {
        $this->postJson('/api/inventario-dotacion', $this->datosItem())->assertCreated();
        $this->postJson('/api/inventario-dotacion', $this->datosItem(['cantidad' => 3]))->assertCreated();

        $this->assertSame(1, InventarioDotacion::where('prenda', 'Chaqueta Nueva')->count());
        $this->assertSame(3, InventarioDotacion::where('prenda', 'Chaqueta Nueva')->value('cantidad'));
    }

    public static function itemsInvalidos(): array
    {
        return [
            'sin prenda'         => [['prenda' => ''], 'prenda'],
            'género inválido'    => [['genero' => 'Otro'], 'genero'],
            'proyecto inválido'  => [['proyecto' => 'TIGO'], 'proyecto'],
            'cantidad negativa'  => [['cantidad' => -1], 'cantidad'],
            'cantidad decimal'   => [['cantidad' => 1.5], 'cantidad'],
            'talla muy larga'    => [['talla' => '12345678901'], 'talla'],
            'precio negativo'    => [['precio' => -5], 'precio'],
            'sede inexistente'   => [['sede_id' => 999999], 'sede_id'],
        ];
    }

    #[DataProvider('itemsInvalidos')]
    public function test_un_item_invalido_se_rechaza(array $cambio, string $campo): void
    {
        foreach (['/api/inventario-dotacion' => $this->datosItem($cambio), '/api/inventario-dotacion/bulk' => ['items' => [$this->datosItem($cambio)]], '/api/inventario-dotacion/import' => ['items' => [$this->datosItem($cambio)]]] as $url => $datos) {
            $errores = $this->postJson($url, $datos)->assertStatus(422)->json('errors');
            $this->assertNotEmpty(array_filter(array_keys($errores), fn ($k) => str_ends_with($k, $campo)), "{$url}: " . json_encode($errores));
        }
        $this->assertSame(0, InventarioDotacion::where('prenda', 'Chaqueta Nueva')->count());
    }

    public function test_una_sede_de_otro_proyecto_se_rechaza_en_todas_las_cargas(): void
    {
        $ajena = $this->sede('SEDE AJENA');
        $datos = $this->datosItem(['sede_id' => $ajena]);

        $this->postJson('/api/inventario-dotacion', $datos)->assertStatus(422);
        $this->postJson('/api/inventario-dotacion/bulk', ['items' => [$datos]])->assertStatus(422);
        $this->postJson('/api/inventario-dotacion/import', ['items' => [$datos]])->assertStatus(422);
        $this->assertSame(0, InventarioDotacion::where('prenda', 'Chaqueta Nueva')->count());
    }

    public function test_la_carga_en_bloque_crea_y_sobrescribe(): void
    {
        $this->postJson('/api/inventario-dotacion/bulk', ['items' => [
            $this->datosItem(), $this->datosItem(['talla' => 'L', 'cantidad' => 1]),
        ]])->assertOk()->assertJsonPath('saved', 2);

        $this->postJson('/api/inventario-dotacion/bulk', ['items' => [$this->datosItem(['cantidad' => 20])]])->assertOk();

        $this->assertSame(20, InventarioDotacion::where(['prenda' => 'Chaqueta Nueva', 'talla' => 'M'])->value('cantidad'));
        $this->assertSame(1, InventarioDotacion::where(['prenda' => 'Chaqueta Nueva', 'talla' => 'L'])->value('cantidad'));
    }

    public function test_importar_excel_crea_lo_nuevo_y_suma_a_lo_existente(): void
    {
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Femenino', 'M');

        $this->postJson('/api/inventario-dotacion/import', ['items' => [
            $this->datosItem(['cantidad' => 4, 'precio' => null, 'stock_minimo' => 10]),
            ['proyecto' => 'DIRECTV', 'sede_id' => $this->sedeId, 'prenda' => $polo->prenda, 'genero' => 'Femenino', 'talla' => 'M', 'cantidad' => 5, 'stock_minimo' => 10],
        ]])->assertOk()->assertJson(['creados' => 1, 'actualizados' => 1]);

        $this->assertSame(15, $polo->fresh()->cantidad);
        $nuevo = InventarioDotacion::where('prenda', 'Chaqueta Nueva')->first();
        $this->assertSame(4, $nuevo->cantidad);
        $this->assertSame(0, $nuevo->precio);
    }

    public function test_importar_acepta_las_tallas_femeninas_de_tigo(): void
    {
        $this->postJson('/api/inventario-dotacion/import', ['items' => [
            ['proyecto' => 'SYM TIGO EXPRESS', 'sede_id' => $this->otraSedeId, 'prenda' => 'Polo Mc Azul Tigo Express', 'genero' => 'Femenino', 'talla' => '16 (2XL)', 'cantidad' => 3, 'stock_minimo' => 10],
        ]])->assertOk()->assertJson(['creados' => 1]);

        $this->assertSame(3, $this->fila('SYM TIGO EXPRESS', 'Polo Mc Azul Tigo Express', 'Femenino', '16 (2XL)', $this->otraSedeId)->cantidad);
    }

    public function test_lo_importado_ya_se_puede_asignar_en_un_pedido_automatico(): void
    {
        $sede = $this->sede('SEDE NUEVA');
        Proyecto::where('nombre', 'DIRECTV')->first()->sedes()->syncWithoutDetaching([$sede]);
        $filas = [];
        foreach ([['Polo Gris Administrativa', 'M'], ['Pantalon Comercial', '32'], ['Carnet', 'N/A']] as [$prenda, $talla]) {
            $filas[] = ['proyecto' => 'DIRECTV', 'sede_id' => $sede, 'prenda' => $prenda, 'genero' => 'Masculino', 'talla' => $talla, 'cantidad' => 5, 'stock_minimo' => 10];
        }
        $this->postJson('/api/inventario-dotacion/import', ['items' => $filas])->assertOk()->assertJson(['creados' => 3]);

        $r = $this->contrato($this->empleado(), ['sede' => 'SEDE NUEVA']);

        $this->assertSame(self::KIT_ASESOR_DTV, $this->nombresDePrendas($this->pedidoDe($r)));
        $this->assertSame(3, $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', $sede)->cantidad);
    }

    public function test_exportar_trae_todas_las_filas_filtradas_con_su_sede(): void
    {
        $todas = $this->getJson('/api/inventario-dotacion?proyecto=DIRECTV')->assertOk()->json();
        $this->assertSame(InventarioDotacion::where('proyecto', 'DIRECTV')->count(), count($todas));
        $this->assertSame(self::SEDE, $todas[0]['sede_nombre']);
        foreach (['proyecto', 'prenda', 'genero', 'talla', 'precio', 'cantidad', 'stock_minimo'] as $columna) {
            $this->assertArrayHasKey($columna, $todas[0]);
        }

        $filtradas = $this->getJson('/api/inventario-dotacion?' . http_build_query(['proyecto' => 'SYM TIGO EXPRESS', 'genero' => 'Femenino', 'talla' => '10 (M)']))->assertOk()->json();
        $this->assertCount(2, $filtradas);
        $this->assertSame(['10 (M)'], array_values(array_unique(array_column($filtradas, 'talla'))));
    }

    public function test_los_filtros_ofrecen_las_tallas_femeninas(): void
    {
        $this->getJson('/api/inventario-dotacion/filtros?' . http_build_query(['proyecto' => 'SYM TIGO EXPRESS', 'genero' => 'Femenino']))
            ->assertOk()->assertJsonFragment(['tallas' => ['10 (M)', '16 (2XL)', '8 (S)']]);
    }

    public function test_el_catalogo_en_cache_se_actualiza_al_descontar_un_pedido(): void
    {
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $stock = fn () => collect($this->getJson('/api/inventario-dotacion')->assertOk()->json())->firstWhere('id', $polo->id)['cantidad'];
        $this->assertSame(10, $stock());

        $pedido = $this->pedidoDe($this->contrato($this->empleado()));
        $this->assertSame(8, $stock(), 'Después del pedido automático.');

        $pedido->cambiarEstado('Cancelado');
        $this->assertSame(10, $stock(), 'Después de cancelarlo.');

        Cache::store('file')->forget(InventarioDotacion::CACHE_KEY_FLAT);
    }

    public function test_editar_y_eliminar_un_item_de_inventario(): void
    {
        $id = $this->postJson('/api/inventario-dotacion', $this->datosItem())->json('id');

        $this->putJson("/api/inventario-dotacion/{$id}", ['cantidad' => 2, 'stock_minimo' => 1, 'precio' => 9])->assertOk()->assertJsonPath('cantidad', 2);
        $this->deleteJson("/api/inventario-dotacion/{$id}")->assertNoContent();

        $this->assertDatabaseMissing('inventario_dotacion', ['id' => $id]);
    }

    // ── Pedido manual de un solo ítem e importado por Excel ──────────────────

    public function test_pedido_manual_de_un_solo_item(): void
    {
        $empleado = $this->empleado();
        $this->contrato($empleado, ['estado_contrato' => 'Finalizado']);
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $r = $this->postJson('/api/pedidos-automaticos', [
            'empleado_id' => $empleado->id, 'items' => [['inventario_dotacion_id' => $polo->id, 'cantidad' => 1]],
        ])->assertCreated()->assertJsonCount(1, 'items')->assertJsonPath('estado', 'Activo');

        $this->assertMatchesRegularExpression('/^\d{5}$/', $r->json('codigo'));
        $this->assertSame(9, $polo->fresh()->cantidad);
    }

    public function test_los_codigos_siguen_el_consecutivo_entre_automaticos_y_manuales(): void
    {
        $a = $this->pedidoDe($this->contrato($this->empleado()))->codigo;
        $empleado = $this->empleado();
        $this->contrato($empleado, ['estado_contrato' => 'Finalizado']);
        $b = $this->postJson('/api/pedidos-automaticos', ['empleado_id' => $empleado->id, 'items' => []])->assertCreated()->json('codigo');
        $c = $this->pedidoDe($this->contrato($this->empleado()))->codigo;

        $this->assertSame((int) $a + 1, (int) $b);
        $this->assertSame((int) $b + 1, (int) $c);
    }

    // ── Enviar a compras: revisión de cada prenda ────────────────────────────

    /** Se agrupa en un pedido global y se envía a Compras con el botón de esa pantalla. */
    private function pedidoEnCompras(array $contrato = []): PedidoAutomatico
    {
        $pedido = $this->pedidoDe($this->contrato($this->empleado(), $contrato + ['regional_id' => $this->regional()]));
        $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->assertCreated();
        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => 'Enviar a compras'])->assertOk();

        return $pedido->fresh();
    }

    /** Pedido manual que ya está en Compras (como los que quedaron de antes, sin pedido global). */
    private function manualEnCompras(User $empleado, InventarioDotacion $prenda, int $cantidad): PedidoAutomatico
    {
        $pedido = PedidoAutomatico::find($this->postJson('/api/pedidos-automaticos', ['empleado_id' => $empleado->id, 'items' => [['inventario_dotacion_id' => $prenda->id, 'cantidad' => $cantidad]]])->assertCreated()->json('id'));
        $pedido->cambiarEstado('Enviar a compras');

        return $pedido->fresh();
    }

    private function itemDe(PedidoAutomatico $pedido, string $prenda)
    {
        return $pedido->items()->with('inventario')->get()->first(fn ($i) => $i->inventario->prenda === $prenda);
    }

    public function test_enviar_a_compras_no_mueve_el_stock(): void
    {
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $this->pedidoEnCompras();

        $this->assertSame(8, $polo->fresh()->cantidad);
        $this->assertDatabaseHas('pedidos_automaticos', ['estado' => 'Enviar a compras']);
    }

    public function test_aprobar_por_stock_no_descuenta_dos_veces(): void
    {
        $pedido = $this->pedidoEnCompras();
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $item = $this->itemDe($pedido, 'Polo Gris Administrativa');

        $this->postJson("/api/pedido-automatico-items/{$item->id}/stock-local", ['observacion' => 'Hay en bodega'])->assertOk();

        $this->assertSame(8, $polo->fresh()->cantidad, 'El pedido ya había descontado sus 2 polos.');
        $this->assertDatabaseHas('pedido_automatico_items', ['id' => $item->id, 'estado_revision' => 'Aprobado por Stock', 'observacion' => 'Hay en bodega']);

        $this->postJson("/api/pedido-automatico-items/{$item->id}/deshacer-revision")->assertOk();
        $this->assertSame(8, $polo->fresh()->cantidad, 'Las prendas siguen en el pedido.');
        $this->assertDatabaseHas('pedido_automatico_items', ['id' => $item->id, 'estado_revision' => null]);
    }

    public function test_aprobar_por_stock_aun_con_el_inventario_en_cero(): void
    {
        $pedido = $this->pedidoEnCompras();
        $polo = $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 0);

        $this->postJson("/api/pedido-automatico-items/{$this->itemDe($pedido, 'Polo Gris Administrativa')->id}/stock-local", ['observacion' => 'ok'])->assertOk();

        $this->assertSame(0, $polo->fresh()->cantidad);
    }

    public function test_aprobar_por_stock_pasa_el_descuento_a_la_sede_del_contrato(): void
    {
        // Pedido manual con la prenda de otra sede, el contrato es de SEDE CAMPO.
        $empleado = $this->empleado();
        $this->contrato($empleado, ['estado_contrato' => 'Finalizado']);
        $deOtraSede = $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', $this->otraSedeId);
        $deSuSede = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $item = $this->manualEnCompras($empleado, $deOtraSede, 2)->items()->first();
        $this->assertSame(8, $deOtraSede->fresh()->cantidad);

        $this->postJson("/api/pedido-automatico-items/{$item->id}/stock-local", ['observacion' => 'ok'])->assertOk();

        $this->assertSame(10, $deOtraSede->fresh()->cantidad);
        $this->assertSame(8, $deSuSede->fresh()->cantidad);
        $this->assertSame($deSuSede->id, $item->fresh()->inventario_dotacion_id);
    }

    public function test_aprobar_por_stock_de_otra_sede_falla_si_la_del_contrato_no_alcanza(): void
    {
        $empleado = $this->empleado();
        $this->contrato($empleado, ['estado_contrato' => 'Finalizado']);
        $deOtraSede = $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', $this->otraSedeId);
        $deSuSede = $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 1);
        $item = $this->manualEnCompras($empleado, $deOtraSede, 2)->items()->first();

        $this->postJson("/api/pedido-automatico-items/{$item->id}/stock-local", ['observacion' => 'x'])->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'Solo hay 1'));

        $this->assertSame(8, $deOtraSede->fresh()->cantidad);
        $this->assertSame(1, $deSuSede->fresh()->cantidad);
    }

    public function test_la_observacion_es_obligatoria_al_aprobar_por_stock(): void
    {
        $item = $this->itemDe($this->pedidoEnCompras(), 'Carnet');

        $this->postJson("/api/pedido-automatico-items/{$item->id}/stock-local", [])->assertStatus(422)->assertJsonValidationErrors('observacion');
    }

    public function test_la_revision_muestra_el_stock_de_su_sede_y_de_las_demas(): void
    {
        $pedido = $this->pedidoEnCompras();
        $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', $this->otraSedeId, 6);

        $filas = collect($this->getJson("/api/pedidos-automaticos/{$pedido->id}/stock-revision")->assertOk()->json());
        $polo = $filas->firstWhere('prenda', 'Polo Gris Administrativa');

        $this->assertSame(self::SEDE, $polo['sede_pedido']['nombre']);
        $this->assertSame(8, $polo['sede_pedido']['cantidad']);
        $this->assertSame(6, collect($polo['sedes_disponibles'])->firstWhere('sede_nombre', self::OTRA_SEDE)['cantidad']);
    }

    public function test_el_traslado_mueve_el_stock_y_se_puede_deshacer(): void
    {
        $pedido = $this->pedidoEnCompras();
        $destino = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $origen = $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', $this->otraSedeId, 6);
        $item = $this->itemDe($pedido, 'Polo Gris Administrativa');

        $this->postJson("/api/pedido-automatico-items/{$item->id}/traslado", ['inventario_dotacion_origen_id' => $origen->id, 'cantidad' => 2])->assertOk();

        $this->assertSame(4, $origen->fresh()->cantidad);
        $this->assertSame(10, $destino->fresh()->cantidad);
        $this->assertDatabaseHas('pedido_automatico_items', ['id' => $item->id, 'estado_revision' => 'Traslado Solicitado']);
        $this->assertDatabaseHas('traslados_dotacion', ['pedido_automatico_item_id' => $item->id, 'estado' => 'Completado', 'cantidad' => 2]);

        $this->postJson("/api/pedido-automatico-items/{$item->id}/deshacer-revision")->assertOk();

        $this->assertSame(6, $origen->fresh()->cantidad);
        $this->assertSame(8, $destino->fresh()->cantidad);
        $this->assertSame('Cancelado', TrasladoDotacion::where('pedido_automatico_item_id', $item->id)->value('estado'));
    }

    public function test_el_traslado_crea_la_fila_si_la_sede_nunca_manejo_esa_prenda(): void
    {
        $empleado = $this->empleado();
        $this->contrato($empleado, ['estado_contrato' => 'Finalizado', 'sede' => self::OTRA_SEDE]);
        $origen = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $item = $this->manualEnCompras($empleado, $origen, 1)->items()->first();

        $this->postJson("/api/pedido-automatico-items/{$item->id}/traslado", ['inventario_dotacion_origen_id' => $origen->id, 'cantidad' => 3])->assertOk();

        $this->assertSame(6, $origen->fresh()->cantidad);
        $this->assertSame(3, $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', $this->otraSedeId)->cantidad);
    }

    public function test_el_traslado_no_acepta_otra_prenda_ni_mas_de_lo_que_hay(): void
    {
        $pedido = $this->pedidoEnCompras();
        $item = $this->itemDe($pedido, 'Polo Gris Administrativa');
        $otraPrenda = $this->prenda('DIRECTV', 'Pantalon Comercial', 'Masculino', '32', $this->otraSedeId, 6);
        $otraTalla = $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', '2XL', $this->otraSedeId, 6);
        $mismaPrenda = $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', $this->otraSedeId, 1);
        $destino = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $url = "/api/pedido-automatico-items/{$item->id}/traslado";

        $this->postJson($url, ['inventario_dotacion_origen_id' => $otraPrenda->id, 'cantidad' => 1])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'misma prenda'));
        $this->postJson($url, ['inventario_dotacion_origen_id' => $otraTalla->id, 'cantidad' => 1])->assertStatus(422);
        $this->postJson($url, ['inventario_dotacion_origen_id' => $mismaPrenda->id, 'cantidad' => 2])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Solo hay 1'));
        $this->postJson($url, ['inventario_dotacion_origen_id' => $destino->id, 'cantidad' => 1])->assertStatus(422);
        $this->postJson($url, ['inventario_dotacion_origen_id' => $mismaPrenda->id, 'cantidad' => 0])->assertStatus(422);

        $this->assertSame(6, $otraPrenda->fresh()->cantidad);
        $this->assertSame(1, $mismaPrenda->fresh()->cantidad);
        $this->assertSame(8, $destino->fresh()->cantidad);
        $this->assertSame(0, TrasladoDotacion::count());
    }

    public function test_no_se_deshace_un_traslado_si_ya_se_uso_lo_trasladado(): void
    {
        $pedido = $this->pedidoEnCompras();
        $origen = $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', $this->otraSedeId, 6);
        $item = $this->itemDe($pedido, 'Polo Gris Administrativa');
        $this->postJson("/api/pedido-automatico-items/{$item->id}/traslado", ['inventario_dotacion_origen_id' => $origen->id, 'cantidad' => 2])->assertOk();
        $destino = $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 1);

        $this->postJson("/api/pedido-automatico-items/{$item->id}/deshacer-revision")->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'solo quedan 1'));

        $this->assertSame(4, $origen->fresh()->cantidad);
        $this->assertSame(1, $destino->fresh()->cantidad);
        $this->assertDatabaseHas('pedido_automatico_items', ['id' => $item->id, 'estado_revision' => 'Traslado Solicitado']);
    }

    public function test_una_prenda_revisada_se_deshace_antes_de_revisarla_otra_vez(): void
    {
        $pedido = $this->pedidoEnCompras();
        $item = $this->itemDe($pedido, 'Polo Gris Administrativa');
        $origen = $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', $this->otraSedeId, 6);
        $this->postJson("/api/pedido-automatico-items/{$item->id}/traslado", ['inventario_dotacion_origen_id' => $origen->id, 'cantidad' => 2])->assertOk();

        $this->postJson("/api/pedido-automatico-items/{$item->id}/enviar-compras")->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'deshaz'));
        $this->postJson("/api/pedido-automatico-items/{$item->id}/stock-local", ['observacion' => 'x'])->assertStatus(422);
        $this->postJson("/api/pedido-automatico-items/{$item->id}/traslado", ['inventario_dotacion_origen_id' => $origen->id, 'cantidad' => 1])->assertStatus(422);

        $this->assertSame(4, $origen->fresh()->cantidad);
    }

    public function test_solo_se_revisan_pedidos_en_enviar_a_compras(): void
    {
        $pedido = $this->pedidoDe($this->contrato($this->empleado()));
        $item = $this->itemDe($pedido, 'Polo Gris Administrativa');

        $this->postJson("/api/pedido-automatico-items/{$item->id}/stock-local", ['observacion' => 'x'])->assertStatus(422);
        $this->postJson("/api/pedido-automatico-items/{$item->id}/enviar-compras")->assertStatus(422);

        $this->assertSame('Activo', $pedido->fresh()->estado);
        $this->assertSame(8, $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M')->cantidad);
    }

    // ── Compras ──────────────────────────────────────────────────────────────

    /** Los pedidos que muestra la pantalla de Compras (ComprasCrud filtra así). */
    private function idsEnCompras(): array
    {
        return collect($this->getJson('/api/pedidos-automaticos')->assertOk()->json())
            ->filter(fn ($p) => $p['recibido_pedidos'] && $p['estado'] === 'Enviar a compras')
            ->pluck('id')->values()->all();
    }

    public function test_el_boton_de_pedidos_globales_lleva_directo_a_compras_sin_mover_el_stock(): void
    {
        $uno = $this->pedidoParaGlobal();
        $otro = $this->pedidoParaGlobal();
        $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->assertCreated()->assertJsonPath('total', 2);
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $this->assertSame(6, $polo->fresh()->cantidad);
        $this->assertSame([], $this->idsEnCompras());

        // Igual que la barra de selección de Pedidos globales: elegir los pedidos y "Aplicar".
        $respuesta = $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$uno->id, $otro->id], 'estado' => 'Enviar a compras'])->assertOk()->json();

        $this->assertSame(['Enviar a compras', 'Enviar a compras'], array_column($respuesta, 'estado'));
        $this->assertSame(['Cotizando', 'Cotizando'], array_column($respuesta, 'estado_compra'));
        $this->assertEqualsCanonicalizing([$uno->id, $otro->id], $this->idsEnCompras());
        $this->assertSame(6, $polo->fresh()->cantidad);
        $this->assertNotNull($uno->fresh()->pedido_global_id, 'Sigue en su pedido global.');

        // Compras ve todas las prendas del pedido, sin revisión previa.
        $enCompras = collect($this->getJson('/api/pedidos-automaticos')->json())->firstWhere('id', $uno->id);
        $this->assertCount(3, $enCompras['items']);
    }

    public function test_compras_cambia_el_estado_de_la_compra(): void
    {
        $pedido = $this->pedidoEnCompras();
        $url = "/api/pedidos-automaticos/{$pedido->id}/estado-compra";

        $this->putJson($url, ['estado_compra' => 'Pendiente Aprobación'])->assertOk()->assertJsonPath('estado_compra', 'Pendiente Aprobación');
        $this->putJson($url, ['estado_compra' => 'Inventado'])->assertStatus(422);
        // Reenviar el mismo estado no reinicia lo que Compras ya avanzó.
        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => 'Enviar a compras'])->assertOk();
        $this->assertSame('Pendiente Aprobación', $pedido->fresh()->estado_compra);
    }

    public function test_un_pedido_que_no_esta_en_compras_no_acepta_estado_de_compra(): void
    {
        $pedido = $this->pedidoDe($this->contrato($this->empleado()));

        $this->putJson("/api/pedidos-automaticos/{$pedido->id}/estado-compra", ['estado_compra' => 'Cotizando'])->assertStatus(422);
        $this->assertSame([], $this->idsEnCompras());
    }

    public function test_regresar_de_compras_lo_devuelve_a_su_pedido_global_como_completado(): void
    {
        $pedido = $this->pedidoParaGlobal();
        $global = $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->json('global.id');
        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => 'Enviar a compras'])->assertOk();

        $this->putJson("/api/pedidos-automaticos/{$pedido->id}/recibido-pedidos", ['recibido' => false])->assertOk()
            ->assertJsonPath('estado', 'Completado')->assertJsonPath('recibido_pedidos', false)->assertJsonPath('estado_compra', null);

        $this->assertSame($global, $pedido->fresh()->pedido_global_id);
        $this->assertSame([], $this->idsEnCompras());
        $this->assertSame(8, $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M')->cantidad);
    }

    public function test_regresar_de_compras_un_pedido_sin_global_lo_deja_en_proceso(): void
    {
        // Los que ya estaban en Compras de antes de esta regla, sin pedido global.
        $pedido = $this->pedidoDe($this->contrato($this->empleado()));
        $pedido->cambiarEstado('Enviar a compras');

        $this->putJson("/api/pedidos-automaticos/{$pedido->id}/recibido-pedidos", ['recibido' => false])->assertOk()
            ->assertJsonPath('estado', 'Activo')->assertJsonPath('estado_compra', null);

        $this->assertSame(8, $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M')->cantidad);
    }

    public function test_cambiar_el_estado_de_un_pedido_en_compras_lo_saca_de_compras(): void
    {
        foreach (['Activo', 'Devolución', 'Devolución usada'] as $estado) {
            $pedido = $this->pedidoEnCompras();
            $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => $estado])->assertOk();

            $this->assertNotContains($pedido->id, $this->idsEnCompras(), $estado);
            $this->assertNull($pedido->fresh()->estado_compra, $estado);
        }
    }

    public function test_pedidos_automaticos_no_permite_enviar_a_compras(): void
    {
        $empleado = $this->empleado();
        $pedido = $this->pedidoDe($this->contrato($empleado));
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $datos = ['empleado_id' => $empleado->id, 'estado' => 'Enviar a compras', 'items' => [['inventario_dotacion_id' => $polo->id, 'cantidad' => 1]]];

        $this->postJson('/api/pedidos-automaticos', $datos)->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Pedidos globales'));
        $this->putJson("/api/pedidos-automaticos/{$pedido->id}", $datos)->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Pedidos globales'));

        $this->assertSame('Activo', $pedido->fresh()->estado);
        $this->assertSame(1, PedidoAutomatico::where('empleado_id', $empleado->id)->count());
        $this->assertSame(8, $polo->fresh()->cantidad);
        $this->assertSame([], $this->idsEnCompras());
    }

    public function test_sin_pedido_global_no_se_llega_a_compras_por_ningun_lado(): void
    {
        $suelto = $this->pedidoDe($this->contrato($this->empleado()));
        $enGlobal = $this->pedidoParaGlobal();
        $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->assertCreated();
        $suelto->refresh();
        $this->assertNull($suelto->pedido_global_id, 'Su contrato no tiene la regional del global.');

        $this->putJson("/api/pedidos-automaticos/{$suelto->id}/recibido-pedidos", ['recibido' => true])->assertStatus(422);
        // En bloque es todo o nada: el que sí está en un global tampoco pasa.
        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$enGlobal->id, $suelto->id], 'estado' => 'Enviar a compras'])->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, $suelto->codigo) && str_contains($m, 'Pedidos globales'));

        $this->assertSame('Completado', $enGlobal->fresh()->estado);
        $this->assertSame('Activo', $suelto->fresh()->estado);
        $this->assertSame([], $this->idsEnCompras());
    }

    public function test_un_pedido_que_ya_estaba_en_compras_se_puede_seguir_editando(): void
    {
        $empleado = $this->empleado();
        $pedido = $this->pedidoDe($this->contrato($empleado));
        $pedido->cambiarEstado('Enviar a compras');

        $this->putJson("/api/pedidos-automaticos/{$pedido->id}", [
            'empleado_id' => $empleado->id, 'estado' => 'Enviar a compras', 'notas' => 'Nota', 'items' => $this->itemsDe($pedido),
        ])->assertOk()->assertJsonPath('notas', 'Nota')->assertJsonPath('estado_compra', 'Cotizando');
    }

    public function test_la_migracion_pasa_a_compras_los_que_esperaban_en_la_pantalla_de_pedidos(): void
    {
        $esperando = $this->pedidoEnCompras();
        $esperando->update(['recibido_pedidos' => false, 'estado_compra' => null]);
        $avanzado = $this->pedidoEnCompras();
        $avanzado->update(['estado_compra' => 'Pendiente Aprobación']);
        $otro = $this->pedidoDe($this->contrato($this->empleado()));

        (require database_path('migrations/2026_11_04_000001_dotacion_directo_a_compras.php'))->up();

        $this->assertTrue((bool) $esperando->fresh()->recibido_pedidos);
        $this->assertSame('Cotizando', $esperando->fresh()->estado_compra);
        $this->assertSame('Pendiente Aprobación', $avanzado->fresh()->estado_compra, 'No reinicia lo que ya avanzó.');
        $this->assertFalse((bool) $otro->fresh()->recibido_pedidos);
    }

    public function test_deshacer_la_ultima_prenda_para_comprar_saca_el_pedido_de_compras(): void
    {
        $pedido = $this->pedidoEnCompras();
        $item = $this->itemDe($pedido, 'Carnet');
        $this->postJson("/api/pedido-automatico-items/{$item->id}/enviar-compras")->assertOk();
        $this->putJson("/api/pedidos-automaticos/{$pedido->id}/recibido-pedidos", ['recibido' => true])->assertOk();

        $this->postJson("/api/pedido-automatico-items/{$item->id}/deshacer-revision")->assertOk()
            ->assertJsonPath('recibido_pedidos', false)->assertJsonPath('estado_compra', null);
    }

    public function test_eliminar_un_pedido_en_compras_devuelve_el_stock(): void
    {
        $pedido = $this->pedidoEnCompras();

        $this->deleteJson("/api/pedidos-automaticos/{$pedido->id}")->assertNoContent();

        $this->assertSame(10, $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M')->cantidad);
        $this->assertDatabaseMissing('pedido_automatico_items', ['pedido_automatico_id' => $pedido->id]);
    }

    public function test_cancelar_un_pedido_en_compras_devuelve_el_stock(): void
    {
        $pedido = $this->pedidoEnCompras();

        $this->putJson("/api/pedidos-automaticos/{$pedido->id}", ['empleado_id' => $pedido->empleado_id, 'estado' => 'Cancelado'])->assertOk();

        $this->assertSame(10, $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M')->cantidad);
    }

    // ── Pedido global, entrega y devolución ──────────────────────────────────

    private function regional(): int
    {
        return DB::table('regionales')->where('nombre', 'EJE CAFETERO')->value('id');
    }

    private function pedidoParaGlobal(array $datos = []): PedidoAutomatico
    {
        return $this->pedidoDe($this->contrato($this->empleado($datos), ['regional_id' => $this->regional()]));
    }

    public function test_el_pedido_automatico_se_agrupa_y_entrega_sin_mover_el_stock(): void
    {
        $empleado = ['email' => 'real@empresa.co'];
        $pedido = $this->pedidoParaGlobal($empleado);
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $global = $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->assertCreated()->assertJsonPath('total', 1)->json('global.id');

        $this->assertSame('Completado', $pedido->fresh()->estado);
        $this->assertSame($global, $pedido->fresh()->pedido_global_id);
        $this->assertSame(8, $polo->fresh()->cantidad);

        $this->putJson("/api/pedidos-globales/{$global}", ['entrega_confirmada' => true])->assertStatus(422);
        $this->putJson("/api/pedidos-globales/{$global}", ['confirmado' => true])->assertOk();
        $this->putJson("/api/pedidos-globales/{$global}", ['entrega_confirmada' => true])->assertOk()
            ->assertJsonPath('actas_entrega.enviadas.0.codigo', $pedido->codigo);

        $this->assertSame(8, $polo->fresh()->cantidad);
    }

    public function test_devolver_y_reactivar_un_pedido_entregado_cuadra_el_stock(): void
    {
        $pedido = $this->pedidoParaGlobal();
        $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->assertCreated();
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $this->postJson("/api/pedidos-automaticos/{$pedido->id}/devolver")->assertOk()->assertJsonPath('estado', 'Devolución');
        $this->assertSame(10, $polo->fresh()->cantidad);
        $this->postJson("/api/pedidos-automaticos/{$pedido->id}/devolver")->assertStatus(422);
        $this->assertSame(10, $polo->fresh()->cantidad);

        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => 'Activo'])->assertOk();
        $this->assertSame(8, $polo->fresh()->cantidad);

        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => 'Devolución usada'])->assertOk();
        $this->assertSame(8, $polo->fresh()->cantidad, 'Una prenda usada no vuelve al inventario.');
    }

    public function test_eliminar_el_global_vuelve_los_pedidos_a_en_proceso_sin_mover_el_stock(): void
    {
        $pedido = $this->pedidoParaGlobal();
        $global = $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->json('global.id');

        $this->deleteJson("/api/pedidos-globales/{$global}")->assertNoContent();

        $fresco = $pedido->fresh();
        $this->assertSame('Activo', $fresco->estado);
        $this->assertNull($fresco->pedido_global_id);
        $this->assertSame(8, $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M')->cantidad);
    }

    public function test_eliminar_el_global_con_un_pedido_devuelto_lo_vuelve_a_descontar(): void
    {
        $pedido = $this->pedidoParaGlobal();
        $global = $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->json('global.id');
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $this->postJson("/api/pedidos-automaticos/{$pedido->id}/devolver")->assertOk();
        $this->assertSame(10, $polo->fresh()->cantidad);

        $this->deleteJson("/api/pedidos-globales/{$global}")->assertNoContent();

        $this->assertSame('Activo', $pedido->fresh()->estado);
        $this->assertSame(8, $polo->fresh()->cantidad, 'Sigue en proceso: sus prendas deben estar descontadas.');
    }

    public function test_no_se_elimina_el_global_si_el_pedido_devuelto_ya_no_tiene_stock(): void
    {
        $pedido = $this->pedidoParaGlobal();
        $global = $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->json('global.id');
        $this->postJson("/api/pedidos-automaticos/{$pedido->id}/devolver")->assertOk();
        $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 0);

        $this->deleteJson("/api/pedidos-globales/{$global}")->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Stock insuficiente'));

        $this->assertNotNull(PedidoGlobal::find($global));
        $this->assertSame('Devolución', $pedido->fresh()->estado);
        $this->assertSame($global, $pedido->fresh()->pedido_global_id);
    }

    public function test_importar_un_global_crea_los_pedidos_y_descuenta(): void
    {
        $empleado = $this->empleado();
        $this->contrato($empleado, ['estado_contrato' => 'Finalizado']);
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $this->postJson('/api/pedidos-globales/import', [
            'proyecto' => 'DIRECTV', 'regional_id' => $this->regional(),
            'pedidos' => [['empleado_id' => $empleado->id, 'items' => [['inventario_dotacion_id' => $polo->id, 'cantidad' => 3]]]],
        ])->assertCreated()->assertJsonPath('total_pedidos', 1)->assertJsonPath('pedidos_automaticos.0.estado', 'Completado');

        $this->assertSame(7, $polo->fresh()->cantidad);
    }

    public function test_importar_un_global_sin_stock_responde_el_motivo_y_no_deja_nada(): void
    {
        $empleado = $this->empleado();
        $this->contrato($empleado, ['estado_contrato' => 'Finalizado']);
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $carnet = $this->fila('DIRECTV', 'Carnet', 'Masculino', 'N/A');

        $this->postJson('/api/pedidos-globales/import', [
            'proyecto' => 'DIRECTV', 'regional_id' => $this->regional(),
            'pedidos' => [['empleado_id' => $empleado->id, 'items' => [
                ['inventario_dotacion_id' => $carnet->id, 'cantidad' => 1],
                ['inventario_dotacion_id' => $polo->id, 'cantidad' => 99],
            ]]],
        ])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Stock insuficiente'));

        $this->assertSame(0, PedidoGlobal::count());
        $this->assertSame(10, $carnet->fresh()->cantidad);
    }

    public function test_importar_un_global_vincula_un_pedido_existente_sin_descontar_otra_vez(): void
    {
        $pedido = $this->pedidoParaGlobal();
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $payload = [
            'proyecto' => 'DIRECTV', 'regional_id' => $this->regional(),
            'pedidos' => [['codigo' => $pedido->codigo, 'empleado_id' => $pedido->empleado_id, 'items' => [['inventario_dotacion_id' => $polo->id, 'cantidad' => 2]]]],
        ];

        $this->postJson('/api/pedidos-globales/import', $payload)->assertCreated();
        $this->assertSame(8, $polo->fresh()->cantidad);
        $this->assertSame('Completado', $pedido->fresh()->estado);

        // Ya pertenece a un global: no entra en otro.
        $this->postJson('/api/pedidos-globales/import', $payload)->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'ya pertenece'));
    }

    // ── Lo que falta se compra ───────────────────────────────────────────────

    /** Asesor DIRECTV (2 polos, 1 pantalón, 1 carnet) con solo 1 polo en stock. */
    private function pedidoConUnPoloPorComprar(array $empleado = [], array $contrato = []): PedidoAutomatico
    {
        $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 1);

        return $this->pedidoDe($this->contrato($this->empleado($empleado), $contrato));
    }

    public function test_si_falta_parte_de_una_prenda_entrega_lo_que_hay_y_el_resto_queda_por_comprar(): void
    {
        $pedido = $this->pedidoConUnPoloPorComprar();
        $item = $this->itemDe($pedido, 'Polo Gris Administrativa');

        $this->assertSame(2, $item->cantidad);
        $this->assertSame(1, $item->cantidad_por_comprar);
        $this->assertSame(0, $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M')->cantidad);
        $this->assertSame(0, $this->itemDe($pedido, 'Carnet')->cantidad_por_comprar);
        $this->assertSame(9, $this->fila('DIRECTV', 'Carnet', 'Masculino', 'N/A')->cantidad);
        $this->assertStringContainsString('por comprar 1', $pedido->notas);
    }

    public static function formasDeDevolverElStock(): array
    {
        return ['cancelar' => ['cancelar'], 'eliminar' => ['eliminar'], 'no ingreso' => ['no ingreso'], 'pendiente' => ['pendiente']];
    }

    #[DataProvider('formasDeDevolverElStock')]
    public function test_al_devolver_el_stock_solo_vuelve_lo_que_salio(string $forma): void
    {
        $empleado = $this->empleado();
        $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 1);
        $r = $this->contrato($empleado);
        $pedido = $this->pedidoDe($r);
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $this->assertSame(0, $polo->cantidad);

        match ($forma) {
            'cancelar'   => $this->putJson("/api/pedidos-automaticos/{$pedido->id}", ['empleado_id' => $empleado->id, 'estado' => 'Cancelado'])->assertOk(),
            'eliminar'   => $this->deleteJson("/api/pedidos-automaticos/{$pedido->id}")->assertNoContent(),
            'no ingreso' => $this->cambiarContrato($empleado, $r->json('id'), ['estado_contrato' => 'No ingreso']),
            'pendiente'  => $this->putJson("/api/pedidos-automaticos/{$pedido->id}", ['empleado_id' => $empleado->id, 'estado' => 'Pendiente'])->assertOk(),
        };

        $this->assertSame(1, $polo->fresh()->cantidad, 'Solo salió 1 de los 2 polos.');
    }

    public function test_pendiente_a_en_proceso_solo_descuenta_lo_que_no_esta_por_comprar(): void
    {
        $empleado = $this->empleado();
        $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 1);
        $pedido = $this->pedidoDe($this->contrato($empleado));
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $this->putJson("/api/pedidos-automaticos/{$pedido->id}", ['empleado_id' => $empleado->id, 'estado' => 'Pendiente'])->assertOk();
        $this->assertSame(1, $polo->fresh()->cantidad);
        $this->putJson("/api/pedidos-automaticos/{$pedido->id}", ['empleado_id' => $empleado->id, 'estado' => 'Activo'])->assertOk();

        $this->assertSame(0, $polo->fresh()->cantidad);
        $this->assertSame(1, $this->itemDe($pedido, 'Polo Gris Administrativa')->cantidad_por_comprar);
    }

    public function test_editar_el_pedido_desde_el_formulario_conserva_lo_que_esta_por_comprar(): void
    {
        $empleado = $this->empleado();
        $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 1);
        $pedido = $this->pedidoDe($this->contrato($empleado));
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        // El formulario manda solo prenda y cantidad, con el mismo pedido sin stock suficiente.
        $this->putJson("/api/pedidos-automaticos/{$pedido->id}", [
            'empleado_id' => $empleado->id, 'estado' => 'Completado', 'items' => $this->itemsDe($pedido),
        ])->assertOk()->assertJsonPath('estado', 'Completado');

        $this->assertSame(1, $this->itemDe($pedido, 'Polo Gris Administrativa')->cantidad_por_comprar);
        $this->assertSame(0, $polo->fresh()->cantidad);
    }

    public function test_pedir_mas_al_editar_si_exige_stock(): void
    {
        $empleado = $this->empleado();
        $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 1);
        $pedido = $this->pedidoDe($this->contrato($empleado));
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $this->putJson("/api/pedidos-automaticos/{$pedido->id}", [
            'empleado_id' => $empleado->id, 'estado' => 'Activo', 'items' => [['inventario_dotacion_id' => $polo->id, 'cantidad' => 3]],
        ])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Stock insuficiente'));

        $this->assertSame(0, $polo->fresh()->cantidad, 'Se revierte todo.');
        $this->assertSame(1, $this->itemDe($pedido, 'Polo Gris Administrativa')->cantidad_por_comprar);
    }

    public function test_lo_que_falta_viaja_con_el_pedido_global_hasta_compras(): void
    {
        $pedido = $this->pedidoConUnPoloPorComprar(contrato: ['regional_id' => $this->regional()]);
        $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->assertCreated();
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $this->assertSame(1, $this->itemDe($pedido, 'Polo Gris Administrativa')->cantidad_por_comprar, 'Agrupar no lo pierde.');

        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => 'Enviar a compras'])->assertOk();

        $enCompras = collect($this->getJson('/api/pedidos-automaticos')->json())->firstWhere('id', $pedido->id);
        $linea = collect($enCompras['items'])->firstWhere('cantidad_por_comprar', 1);
        $this->assertSame('Polo Gris Administrativa', $linea['inventario']['prenda']);
        $this->assertSame(0, $polo->fresh()->cantidad);

        // Regresarlo tampoco lo pierde.
        $this->putJson("/api/pedidos-automaticos/{$pedido->id}/recibido-pedidos", ['recibido' => false])->assertOk();
        $this->assertSame(1, $this->itemDe($pedido, 'Polo Gris Administrativa')->cantidad_por_comprar);
    }

    public function test_devolver_un_pedido_entregado_solo_devuelve_lo_entregado(): void
    {
        $pedido = $this->pedidoConUnPoloPorComprar(contrato: ['regional_id' => $this->regional()]);
        $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->assertCreated();

        $this->postJson("/api/pedidos-automaticos/{$pedido->id}/devolver")->assertOk();

        $this->assertSame(1, $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M')->cantidad);
    }

    public function test_no_se_confirma_la_entrega_con_prendas_por_comprar(): void
    {
        $pedido = $this->pedidoConUnPoloPorComprar(['email' => 'real@empresa.co'], ['regional_id' => $this->regional()]);
        $global = $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->json('global.id');

        // Confirmar el pedido sí se puede; la entrega no.
        $this->putJson("/api/pedidos-globales/{$global}", ['confirmado' => true])->assertOk();
        $this->putJson("/api/pedidos-globales/{$global}", ['entrega_confirmada' => true])->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'No se puede confirmar la entrega') && str_contains($m, $pedido->codigo));

        $this->assertFalse((bool) PedidoGlobal::find($global)->entrega_confirmada);
        Mail::assertNothingSent();
    }

    public function test_confirmar_pedido_y_entrega_a_la_vez_tampoco_deja_nada_a_medias(): void
    {
        $this->pedidoConUnPoloPorComprar(contrato: ['regional_id' => $this->regional()]);
        $global = $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->json('global.id');

        $this->putJson("/api/pedidos-globales/{$global}", ['confirmado' => true, 'entrega_confirmada' => true])->assertStatus(422);

        $fresco = PedidoGlobal::find($global);
        $this->assertFalse((bool) $fresco->confirmado);
        $this->assertFalse((bool) $fresco->entrega_confirmada);
    }

    public function test_el_mensaje_nombra_todos_los_pedidos_que_faltan_y_no_los_completos(): void
    {
        $completo = $this->pedidoDe($this->contrato($this->empleado(), ['regional_id' => $this->regional()]));
        $conFaltante = $this->pedidoConUnPoloPorComprar(contrato: ['regional_id' => $this->regional()]);
        $this->prenda('DIRECTV', 'Carnet', 'Masculino', 'N/A', cantidad: 0);
        $otroConFaltante = $this->pedidoDe($this->contrato($this->empleado(), ['regional_id' => $this->regional()]));
        $global = $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->assertCreated()->assertJsonPath('total', 3)->json('global.id');

        $mensaje = $this->putJson("/api/pedidos-globales/{$global}", ['confirmado' => true, 'entrega_confirmada' => true])->assertStatus(422)->json('message');

        $this->assertStringContainsString($conFaltante->codigo, $mensaje);
        $this->assertStringContainsString($otroConFaltante->codigo, $mensaje);
        $this->assertStringNotContainsString($completo->codigo, $mensaje);
    }

    public function test_no_se_confirma_la_entrega_con_un_pedido_en_compras_aunque_no_le_falte_nada(): void
    {
        $pedido = $this->pedidoParaGlobal();
        $global = $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->json('global.id');
        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => 'Enviar a compras'])->assertOk();

        $this->putJson("/api/pedidos-globales/{$global}", ['confirmado' => true, 'entrega_confirmada' => true])->assertStatus(422);

        // Regresado de Compras, ya se puede.
        $this->putJson("/api/pedidos-automaticos/{$pedido->id}/recibido-pedidos", ['recibido' => false])->assertOk();
        $this->putJson("/api/pedidos-globales/{$global}", ['confirmado' => true, 'entrega_confirmada' => true])->assertOk();
    }

    public function test_regresar_de_compras_sin_importar_no_habilita_la_entrega(): void
    {
        $pedido = $this->pedidoConUnPoloPorComprar(contrato: ['regional_id' => $this->regional()]);
        $global = $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->json('global.id');
        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => 'Enviar a compras'])->assertOk();
        $this->putJson("/api/pedidos-automaticos/{$pedido->id}/recibido-pedidos", ['recibido' => false])->assertOk();

        $this->putJson("/api/pedidos-globales/{$global}", ['confirmado' => true, 'entrega_confirmada' => true])->assertStatus(422);
    }

    public function test_un_pedido_devuelto_no_bloquea_la_entrega_de_los_demas(): void
    {
        $devuelto = $this->pedidoConUnPoloPorComprar(contrato: ['regional_id' => $this->regional()]);
        $global = $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->json('global.id');
        $this->postJson("/api/pedidos-automaticos/{$devuelto->id}/devolver")->assertOk();

        $this->putJson("/api/pedidos-globales/{$global}", ['confirmado' => true, 'entrega_confirmada' => true])->assertOk();
    }

    public function test_una_compra_parcial_sigue_bloqueando_y_la_completa_habilita_la_entrega_con_acta_completa(): void
    {
        $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 0);
        $pedido = $this->pedidoDe($this->contrato($this->empleado(['email' => 'real@empresa.co']), ['regional_id' => $this->regional()]));
        $global = $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->json('global.id');
        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => 'Enviar a compras'])->assertOk();
        $this->putJson("/api/pedidos-globales/{$global}", ['confirmado' => true])->assertOk();

        // Llega 1 de los 2 polos: sigue bloqueada.
        $this->postJson('/api/inventario-dotacion/import', ['items' => [$this->filaDeCompra($pedido, 'Polo Gris Administrativa', 1)]])->assertOk();
        $this->putJson("/api/pedidos-globales/{$global}", ['entrega_confirmada' => true])->assertStatus(422);

        // Llega el otro: se habilita y el acta lleva los 2.
        $this->postJson('/api/inventario-dotacion/import', ['items' => [$this->filaDeCompra($pedido, 'Polo Gris Administrativa', 1)]])->assertOk()
            ->assertJsonPath('pedidos_completos', [$pedido->codigo]);
        $vista = null;
        \Illuminate\Support\Facades\View::composer('pdf.acta_entrega_dotacion', function ($v) use (&$vista) {
            $vista = $v->getData()['items'];
        });
        $this->putJson("/api/pedidos-globales/{$global}", ['entrega_confirmada' => true])->assertOk()
            ->assertJsonPath('actas_entrega.enviadas.0.codigo', $pedido->codigo);

        $this->assertSame(2, collect($vista)->firstWhere('producto', 'Polo Gris Administrativa')['cantidad']);
    }

    public function test_el_stock_nunca_queda_negativo_con_muchos_ingresos_y_poco_stock(): void
    {
        $polo = $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 5);
        $porComprar = 0;
        foreach (range(1, 6) as $i) {
            $pedido = $this->pedidoDe($this->contrato($this->empleado()));
            $porComprar += $this->itemDe($pedido, 'Polo Gris Administrativa')->cantidad_por_comprar;
            $this->assertGreaterThanOrEqual(0, $polo->fresh()->cantidad);
        }

        // 6 personas × 2 polos = 12 polos; había 5 y se compran 7.
        $this->assertSame(0, $polo->fresh()->cantidad);
        $this->assertSame(7, $porComprar);
    }

    // ── Completar la compra e importar lo comprado ───────────────────────────

    /** Pedido en Compras con 1 polo por comprar. */
    private function compraConUnPolo(array $empleado = []): PedidoAutomatico
    {
        $pedido = $this->pedidoConUnPoloPorComprar($empleado, ['regional_id' => $this->regional()]);
        $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->assertCreated();
        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => 'Enviar a compras'])->assertOk();

        return $pedido->fresh();
    }

    /** La fila del Excel generado, como la envía el importador. */
    private function filaDeCompra(PedidoAutomatico $pedido, string $prenda, int $cantidad, string $talla = 'M', ?string $sede = self::SEDE): array
    {
        return ['pedido_codigo' => $pedido->codigo, 'sede_nombre' => $sede, 'proyecto' => 'DIRECTV', 'prenda' => $prenda, 'genero' => 'Masculino', 'talla' => $talla, 'cantidad' => $cantidad, 'stock_minimo' => 10];
    }

    // ── Orden de Compra de las prendas ───────────────────────────────────────

    /** Crea una orden de compra con las líneas indicadas del pedido de dotación. */
    private function ordenDe(array $lineas, array $extra = [])
    {
        $proveedor = \Illuminate\Support\Facades\DB::table('proveedores')->insertGetId([
            'nit' => (string) random_int(100000000, 999999999), 'naturaleza' => 'JURIDICA',
            'nombre' => 'CONFECCIONES', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return $this->postJson('/api/ordenes-compra', [
            'sede_id' => $this->sedeId, 'proveedor_id' => $proveedor,
            'items' => array_map(fn ($l) => ['pedido_automatico_item_id' => $l->id, 'precio_unitario' => 20000, 'iva_porcentaje' => 19], $lineas),
        ] + $extra);
    }

    private function lineasPorComprar(PedidoAutomatico $pedido): array
    {
        return $pedido->items()->where('cantidad_por_comprar', '>', 0)->get()->all();
    }

    public function test_las_prendas_de_un_pedido_en_compras_salen_como_dotacion_en_la_orden_de_compra(): void
    {
        $pedido = $this->compraConUnPolo();

        $this->getJson('/api/ordenes-compra-pendientes-categoria')->assertOk()
            ->assertExactJson([['categoria' => 'Dotación', 'cantidad_items' => 1]]);

        $fila = $this->getJson('/api/ordenes-compra-items-pendientes?categoria=Dotaci%C3%B3n')->assertOk()->json('0');
        $this->assertSame('dotacion', $fila['origen']);
        $this->assertSame($pedido->codigo, $fila['pedido_codigo']);
        $this->assertSame('Polo Gris Administrativa · Masculino · T:M', $fila['producto']);
        $this->assertSame(1, $fila['cantidad'], 'Solo lo que falta, no todo lo del pedido.');
        $this->assertSame(self::SEDE, $fila['sede']);
    }

    public function test_un_pedido_que_no_esta_en_compras_no_sale_en_la_orden_de_compra(): void
    {
        $pedido = $this->pedidoConUnPoloPorComprar(contrato: ['regional_id' => $this->regional()]);

        $this->assertSame([], $this->getJson('/api/ordenes-compra-pendientes-categoria')->json());
        $this->ordenDe($this->lineasPorComprar($pedido))->assertStatus(422);
    }

    public function test_crear_la_orden_calcula_con_lo_que_falta_y_la_saca_de_pendientes(): void
    {
        $pedido = $this->compraConUnPolo();
        $linea = $this->lineasPorComprar($pedido)[0];

        $orden = $this->ordenDe([$linea], ['valor_transporte' => 1000])->assertCreated()
            ->assertJsonPath('subtotal', 20000)->assertJsonPath('iva_total', 3800)->assertJsonPath('valor_total', 24800)
            ->assertJsonPath('estado', 'Creada')
            ->assertJsonPath('items.0.categoria', 'Dotación')
            ->assertJsonPath('items.0.cantidad', 1)
            ->assertJsonPath('items.0.producto', 'Polo Gris Administrativa · Masculino · T:M');

        $this->assertSame($orden->json('id'), $linea->fresh()->orden_compra_id);
        $this->assertSame([], $this->getJson('/api/ordenes-compra-pendientes-categoria')->json());
        $this->ordenDe([$linea])->assertStatus(422);
        $this->assertSame(1, \App\Models\OrdenCompra::count());
    }

    public function test_el_id_de_una_prenda_no_se_confunde_con_el_de_un_producto_de_oficina(): void
    {
        $pedido = $this->compraConUnPolo();
        $linea = $this->lineasPorComprar($pedido)[0];

        // Sin producto de oficina con ese id: enviarlo como oficina se rechaza, como prenda funciona.
        $this->postJson('/api/ordenes-compra', [
            'sede_id' => $this->sedeId, 'proveedor_id' => 999999,
            'items' => [['pedido_compra_item_id' => $linea->id, 'precio_unitario' => 1, 'iva_porcentaje' => 0]],
        ])->assertStatus(422)->assertJsonValidationErrors(['items.0.pedido_compra_item_id']);
        $this->ordenDe([$linea])->assertCreated();
    }

    public function test_la_misma_prenda_dos_veces_en_una_orden_se_rechaza(): void
    {
        $linea = $this->lineasPorComprar($this->compraConUnPolo())[0];

        $this->ordenDe([$linea, $linea])->assertStatus(422);
        $this->assertSame(0, \App\Models\OrdenCompra::count());
    }

    public function test_el_estado_completada_ya_no_se_elige_en_compras(): void
    {
        $pedido = $this->compraConUnPolo();

        $this->putJson("/api/pedidos-automaticos/{$pedido->id}/estado-compra", ['estado_compra' => 'Completada'])->assertStatus(422);
        $this->assertSame('Cotizando', $pedido->fresh()->estado_compra);
    }

    public function test_completar_la_orden_genera_el_excel_y_marca_el_pedido(): void
    {
        $pedido = $this->compraConUnPolo();
        $orden = $this->ordenDe($this->lineasPorComprar($pedido))->json('id');

        $r = $this->putJson("/api/ordenes-compra/{$orden}/completar")->assertOk()
            ->assertJsonPath('orden.estado', 'Completada')
            ->assertJsonPath('sin_pedido', []);
        $this->assertSame([[
            'pedido' => $pedido->codigo, 'proyecto' => 'DIRECTV', 'sede' => self::SEDE,
            'prenda' => 'Polo Gris Administrativa', 'genero' => 'Masculino', 'talla' => 'M', 'cantidad' => 1,
        ]], $r->json('filas'));

        $fresco = $pedido->fresh();
        $this->assertSame('Completada', $fresco->estado_compra);
        $this->assertSame('Enviar a compras', $fresco->estado, 'Sigue en Compras hasta importar el Excel.');
        $this->putJson("/api/pedidos-automaticos/{$pedido->id}/estado-compra", ['estado_compra' => 'Cotizando'])->assertStatus(422);
        $this->putJson("/api/ordenes-compra/{$orden}/completar")->assertStatus(422);
    }

    public function test_el_excel_de_la_orden_se_importa_y_el_pedido_vuelve_listo_para_entregar(): void
    {
        $pedido = $this->compraConUnPolo();
        $orden = $this->ordenDe($this->lineasPorComprar($pedido))->json('id');
        $filas = $this->putJson("/api/ordenes-compra/{$orden}/completar")->json('filas');

        $this->postJson('/api/inventario-dotacion/import', ['items' => array_map(fn ($f) => [
            'pedido_codigo' => $f['pedido'], 'sede_nombre' => $f['sede'], 'proyecto' => $f['proyecto'], 'prenda' => $f['prenda'],
            'genero' => $f['genero'], 'talla' => $f['talla'], 'cantidad' => $f['cantidad'], 'stock_minimo' => 10,
        ], $filas)])->assertOk()->assertJsonPath('pedidos_completos', [$pedido->codigo]);

        $this->assertSame('Completado', $pedido->fresh()->estado);
        $this->putJson("/api/pedidos-globales/{$pedido->fresh()->pedido_global_id}", ['confirmado' => true, 'entrega_confirmada' => true])->assertOk();

        // Descargar de nuevo no vuelve a traer lo que ya se importó.
        $this->getJson("/api/ordenes-compra/{$orden}/excel-dotacion")->assertOk()->assertJsonPath('filas', []);
    }

    public function test_el_excel_trae_solo_lo_que_falta_tras_una_importacion_parcial(): void
    {
        $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 0);
        $pedido = $this->pedidoDe($this->contrato($this->empleado(), ['regional_id' => $this->regional()]));
        $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->assertCreated();
        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => 'Enviar a compras'])->assertOk();
        $orden = $this->ordenDe($this->lineasPorComprar($pedido))->json('id');
        $this->putJson("/api/ordenes-compra/{$orden}/completar")->assertOk();

        $this->postJson('/api/inventario-dotacion/import', ['items' => [$this->filaDeCompra($pedido, 'Polo Gris Administrativa', 1)]])->assertOk();

        $this->assertSame(1, $this->getJson("/api/ordenes-compra/{$orden}/excel-dotacion")->json('filas.0.cantidad'));
        // Ya entró parte al inventario: la orden no se puede eliminar.
        $this->deleteJson("/api/ordenes-compra/{$orden}")->assertStatus(422);
        $this->assertNotNull(\App\Models\OrdenCompra::find($orden));
    }

    public function test_un_pedido_solo_queda_completada_cuando_no_le_falta_otra_compra(): void
    {
        $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 0);
        $this->prenda('DIRECTV', 'Carnet', 'Masculino', 'N/A', cantidad: 0);
        $pedido = $this->pedidoDe($this->contrato($this->empleado(), ['regional_id' => $this->regional()]));
        $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->assertCreated();
        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => 'Enviar a compras'])->assertOk();
        [$primera, $segunda] = $this->lineasPorComprar($pedido);

        $orden1 = $this->ordenDe([$primera])->json('id');
        $this->putJson("/api/ordenes-compra/{$orden1}/completar")->assertOk();
        $this->assertSame('Cotizando', $pedido->fresh()->estado_compra, 'Falta una prenda sin orden.');

        $orden2 = $this->ordenDe([$segunda])->json('id');
        $this->assertSame('Cotizando', $pedido->fresh()->estado_compra, 'Falta completar la segunda orden.');
        $this->putJson("/api/ordenes-compra/{$orden2}/completar")->assertOk();
        $this->assertSame('Completada', $pedido->fresh()->estado_compra);
    }

    public function test_eliminar_la_orden_devuelve_las_prendas_a_pendientes_y_reabre_la_compra(): void
    {
        $pedido = $this->compraConUnPolo();
        $linea = $this->lineasPorComprar($pedido)[0];
        $orden = $this->ordenDe([$linea])->json('id');
        $this->putJson("/api/ordenes-compra/{$orden}/completar")->assertOk();

        $this->deleteJson("/api/ordenes-compra/{$orden}")->assertNoContent();

        $this->assertNull($linea->fresh()->orden_compra_id);
        $this->assertSame('Pendiente Aprobación', $pedido->fresh()->estado_compra);
        $this->getJson('/api/ordenes-compra-pendientes-categoria')->assertExactJson([['categoria' => 'Dotación', 'cantidad_items' => 1]]);
    }

    public function test_editar_el_pedido_no_saca_la_prenda_de_su_orden_ni_la_vuelve_pendiente(): void
    {
        $pedido = $this->compraConUnPolo();
        $orden = $this->ordenDe($this->lineasPorComprar($pedido))->json('id');

        $items = $pedido->items()->get()->map(fn ($i) => ['inventario_dotacion_id' => $i->inventario_dotacion_id, 'cantidad' => $i->cantidad])->all();
        \Illuminate\Support\Facades\DB::transaction(fn () => $pedido->fresh()->cambiarEstado('Enviar a compras', $items));

        $this->assertSame($orden, $pedido->items()->where('cantidad_por_comprar', '>', 0)->value('orden_compra_id'));
        $this->assertSame([], $this->getJson('/api/ordenes-compra-pendientes-categoria')->json(), 'Se compraría dos veces.');
        $this->assertSame(1, $this->putJson("/api/ordenes-compra/{$orden}/completar")->assertOk()->json('filas.0.cantidad'));
    }

    public function test_una_prenda_cuyo_pedido_se_cancelo_se_avisa_y_no_entra_al_excel(): void
    {
        $pedido = $this->compraConUnPolo();
        $orden = $this->ordenDe($this->lineasPorComprar($pedido))->json('id');

        \Illuminate\Support\Facades\DB::transaction(fn () => $pedido->fresh()->cambiarEstado('Cancelado'));

        $this->putJson("/api/ordenes-compra/{$orden}/completar")->assertOk()
            ->assertJsonPath('filas', [])
            ->assertJsonPath('sin_pedido', ['Polo Gris Administrativa · Masculino · T:M']);
    }

    public function test_una_orden_de_solo_oficina_no_tiene_el_paso_de_completar(): void
    {
        $orden = \App\Models\OrdenCompra::create([
            'codigo' => 'OC-900', 'fecha_registro' => now(), 'sede_id' => $this->sedeId,
            'proveedor_id' => \Illuminate\Support\Facades\DB::table('proveedores')->insertGetId([
                'nit' => '900900900', 'naturaleza' => 'JURIDICA', 'nombre' => 'X', 'created_at' => now(), 'updated_at' => now(),
            ]),
            'naturaleza' => 'JURIDICA', 'estado' => 'Creada',
        ]);

        $this->putJson("/api/ordenes-compra/{$orden->id}/completar")->assertStatus(422);
        $this->assertSame('Creada', $orden->fresh()->estado);
    }

    public function test_el_pdf_de_una_orden_con_prendas_se_genera(): void
    {
        $orden = $this->ordenDe($this->lineasPorComprar($this->compraConUnPolo()))->json('id');

        $this->assertStringStartsWith('%PDF', $this->get("/api/ordenes-compra/{$orden}/pdf")->assertOk()->getContent());
    }

    public function test_importar_lo_comprado_lo_asigna_al_pedido_sin_dejar_stock_libre(): void
    {
        $pedido = $this->compraConUnPolo();
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $this->postJson('/api/inventario-dotacion/import', ['items' => [$this->filaDeCompra($pedido, 'Polo Gris Administrativa', 1)]])->assertOk()
            ->assertJsonPath('asignados_a_pedidos.0.pedido', $pedido->codigo)->assertJsonPath('asignados_a_pedidos.0.cantidad', 1)
            ->assertJsonPath('pedidos_completos', [$pedido->codigo])->assertJsonPath('omitidas', []);

        $this->assertSame(0, $polo->fresh()->cantidad, 'El polo comprado es del pedido: nadie más lo puede tomar.');
        $this->assertSame(0, $this->itemDe($pedido, 'Polo Gris Administrativa')->cantidad_por_comprar);
        $fresco = $pedido->fresh();
        $this->assertSame('Completado', $fresco->estado, 'Con todo comprado vuelve a Dotación.');
        $this->assertNull($fresco->estado_compra);
        $this->assertSame([], $this->idsEnCompras());
    }

    public function test_importar_el_mismo_excel_dos_veces_no_infla_el_inventario(): void
    {
        $pedido = $this->compraConUnPolo();
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $fila = $this->filaDeCompra($pedido, 'Polo Gris Administrativa', 1);

        $this->postJson('/api/inventario-dotacion/import', ['items' => [$fila]])->assertOk();
        $this->postJson('/api/inventario-dotacion/import', ['items' => [$fila]])->assertOk()
            ->assertJsonPath('asignados_a_pedidos', [])
            ->assertJsonPath('omitidas.0.motivo', fn ($m) => str_contains($m, 'ya se importó'));

        $this->assertSame(0, $polo->fresh()->cantidad);
    }

    public function test_lo_que_se_compre_de_mas_si_entra_al_inventario(): void
    {
        $pedido = $this->compraConUnPolo();
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $this->postJson('/api/inventario-dotacion/import', ['items' => [$this->filaDeCompra($pedido, 'Polo Gris Administrativa', 5)]])->assertOk()
            ->assertJsonPath('asignados_a_pedidos.0.cantidad', 1);

        $this->assertSame(4, $polo->fresh()->cantidad);
        $this->assertSame(0, $this->itemDe($pedido, 'Polo Gris Administrativa')->cantidad_por_comprar);
    }

    public function test_una_compra_parcial_deja_el_pedido_en_compras_con_lo_que_falta(): void
    {
        $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 0);
        $pedido = $this->pedidoDe($this->contrato($this->empleado(), ['regional_id' => $this->regional()]));
        $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->assertCreated();
        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => 'Enviar a compras'])->assertOk();

        $this->postJson('/api/inventario-dotacion/import', ['items' => [$this->filaDeCompra($pedido, 'Polo Gris Administrativa', 1)]])->assertOk()
            ->assertJsonPath('pedidos_completos', []);

        $this->assertSame(1, $this->itemDe($pedido, 'Polo Gris Administrativa')->cantidad_por_comprar);
        $this->assertSame([$pedido->id], $this->idsEnCompras());
    }

    public function test_importar_a_una_sede_fuera_del_proyecto_funciona_si_la_fila_es_de_una_compra(): void
    {
        // HUGHES en una sede que no es de DIRECTV: el pedido creó las filas en 0.
        $sede = $this->sede('SEDE HUGHES');
        $pedido = $this->pedidoDe($this->contrato($this->empleado(), ['cliente_proyecto' => 'HUGHES COL', 'sede' => 'SEDE HUGHES', 'regional_id' => $this->regional()]));
        $this->postJson('/api/pedidos-globales', ['proyecto' => 'HUGHES COL'])->assertCreated();
        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => 'Enviar a compras'])->assertOk();
        $filas = [];
        foreach ($pedido->items()->with('inventario')->get() as $i) {
            $filas[] = $this->filaDeCompra($pedido, $i->inventario->prenda, $i->cantidad_por_comprar, $i->inventario->talla, 'SEDE HUGHES');
        }

        $this->postJson('/api/inventario-dotacion/import', ['items' => $filas])->assertOk()
            ->assertJsonPath('pedidos_completos', [$pedido->codigo])->assertJsonPath('omitidas', []);

        $this->assertSame(0, (int) $pedido->items()->sum('cantidad_por_comprar'));
        $this->assertSame(0, (int) InventarioDotacion::where('sede_id', $sede)->sum('cantidad'), 'Todo quedó asignado al pedido.');
        // Una fila sin pedido sigue exigiendo que la sede sea del proyecto.
        $this->postJson('/api/inventario-dotacion/import', ['items' => [['proyecto' => 'DIRECTV', 'sede_id' => $sede, 'prenda' => 'Gorra', 'genero' => 'Masculino', 'talla' => 'N/A', 'cantidad' => 1]]])->assertStatus(422);
    }

    public function test_una_fila_con_pedido_equivocado_se_omite_y_no_toca_el_stock(): void
    {
        $otro = $this->pedidoDe($this->contrato($this->empleado())); // con stock: nada pendiente
        $pedido = $this->compraConUnPolo();
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $carnet = $this->fila('DIRECTV', 'Carnet', 'Masculino', 'N/A');
        $carnetAntes = $carnet->fresh()->cantidad;

        $r = $this->postJson('/api/inventario-dotacion/import', ['items' => [
            array_merge($this->filaDeCompra($pedido, 'Polo Gris Administrativa', 1), ['pedido_codigo' => '99999']),
            $this->filaDeCompra($otro, 'Polo Gris Administrativa', 1),
            $this->filaDeCompra($pedido, 'Carnet', 1, 'N/A'),
            $this->filaDeCompra($pedido, 'Prenda Inventada', 1),
        ]])->assertOk();

        $this->assertCount(4, $r->json('omitidas'));
        $this->assertSame(0, $polo->fresh()->cantidad);
        $this->assertSame($carnetAntes, $carnet->fresh()->cantidad);
        $this->assertSame(1, $this->itemDe($pedido, 'Polo Gris Administrativa')->cantidad_por_comprar);
    }

    public function test_una_importacion_normal_sin_pedido_sigue_sumando_al_stock(): void
    {
        $polo = $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 1);

        $this->postJson('/api/inventario-dotacion/import', ['items' => [
            ['proyecto' => 'DIRECTV', 'sede_id' => $this->sedeId, 'prenda' => $polo->prenda, 'genero' => 'Masculino', 'talla' => 'M', 'cantidad' => 3, 'stock_minimo' => 10],
        ]])->assertOk()->assertJson(['creados' => 0, 'actualizados' => 1, 'asignados_a_pedidos' => []]);

        $this->assertSame(4, $polo->fresh()->cantidad);
    }

    public function test_si_el_pedido_es_pendiente_lo_comprado_queda_en_stock_hasta_activarlo(): void
    {
        $empleado = $this->empleado();
        $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 1);
        $pedido = $this->pedidoDe($this->contrato($empleado));
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $this->putJson("/api/pedidos-automaticos/{$pedido->id}", ['empleado_id' => $empleado->id, 'estado' => 'Pendiente'])->assertOk();
        $this->assertSame(1, $polo->fresh()->cantidad);

        $this->postJson('/api/inventario-dotacion/import', ['items' => [$this->filaDeCompra($pedido, 'Polo Gris Administrativa', 1)]])->assertOk();
        $this->assertSame(2, $polo->fresh()->cantidad);

        $this->putJson("/api/pedidos-automaticos/{$pedido->id}", ['empleado_id' => $empleado->id, 'estado' => 'Activo'])->assertOk();
        $this->assertSame(0, $polo->fresh()->cantidad);
    }

    public function test_circuito_de_compra_completo_el_inventario_cuadra(): void
    {
        $total = fn () => (int) InventarioDotacion::sum('cantidad');
        $pedido = $this->compraConUnPolo(['email' => 'compra@empresa.co']);
        $antes = $total();

        $orden = $this->ordenDe($this->lineasPorComprar($pedido))->assertCreated()->json('id');
        $this->putJson("/api/ordenes-compra/{$orden}/completar")->assertOk();
        $this->postJson('/api/inventario-dotacion/import', ['items' => [$this->filaDeCompra($pedido, 'Polo Gris Administrativa', 1)]])->assertOk();
        $this->assertSame($antes, $total(), 'Lo comprado se asigna al pedido: no aparece como stock libre.');

        // Ya completo se entrega, con todo en el acta, y al devolverlo vuelven también los comprados.
        $global = $pedido->fresh()->pedido_global_id;
        $vista = null;
        \Illuminate\Support\Facades\View::composer('pdf.acta_entrega_dotacion', function ($v) use (&$vista) {
            $vista = $v->getData()['items'];
        });
        $this->putJson("/api/pedidos-globales/{$global}", ['confirmado' => true, 'entrega_confirmada' => true])->assertOk();
        $this->assertSame(2, collect($vista)->firstWhere('producto', 'Polo Gris Administrativa')['cantidad']);

        $this->postJson("/api/pedidos-automaticos/{$pedido->id}/devolver")->assertOk();
        $this->assertSame($antes + 4, $total(), '2 polos, 1 pantalón y 1 carnet.');
    }

    // ── Situaciones al crear el contrato ─────────────────────────────────────

    public static function formasDeNoTraerEstado(): array
    {
        return ['sin la columna' => [false], 'columna vacía' => [true]];
    }

    #[DataProvider('formasDeNoTraerEstado')]
    public function test_un_contrato_sin_estado_es_vigente_y_genera_su_pedido(bool $conColumna): void
    {
        $datos = $this->datosContrato($this->empleado());
        unset($datos['estado_contrato']);
        if ($conColumna) {
            $datos['estado_contrato'] = '';
        }

        $r = $this->postJson('/api/contratos', $datos)->assertCreated()->assertJsonPath('estado_contrato', 'Vigente');

        $this->assertSame(self::KIT_ASESOR_DTV, $this->nombresDePrendas($this->pedidoDe($r)));
    }

    public static function estadosQueNoDanDotacion(): array
    {
        return [['Finalizado'], ['Finalizado traslado'], ['Traslado'], ['No ingreso']];
    }

    #[DataProvider('estadosQueNoDanDotacion')]
    public function test_un_contrato_no_vigente_no_genera_pedido_y_dice_por_que(string $estado): void
    {
        $r = $this->contrato($this->empleado(), ['estado_contrato' => $estado]);

        $r->assertJsonPath('pedido_automatico', null)
            ->assertJsonPath('pedido_automatico_motivo', fn ($m) => str_contains($m, $estado));
    }

    public static function proyectosEscritosDistinto(): array
    {
        return [
            'minúsculas'        => ['directv', self::KIT_ASESOR_DTV],
            'con espacios'      => ['  TIGO HOME ', self::KIT_HOME],
            'nombre mixto'      => ['Tigo Express', self::KIT_EXPRESS],
            'HUGHES minúsculas' => ['hughes col', self::KIT_TECNICO],
            'alias viejo'       => ['ADMINISTRACION', self::KIT_ADMIN],
            'sin proyecto'      => [null, self::KIT_ADMIN],
        ];
    }

    #[DataProvider('proyectosEscritosDistinto')]
    public function test_el_proyecto_se_reconoce_como_sea_que_venga_escrito(?string $proyecto, array $kit): void
    {
        $r = $this->contrato($this->empleado(), ['cliente_proyecto' => $proyecto]);

        $this->assertSame($kit, $this->nombresDePrendas($this->pedidoDe($r)));
    }

    public static function cargosRaros(): array
    {
        return [
            'DIRECTV sin cargo'         => ['DIRECTV', null, self::KIT_ASESOR_DTV],
            'Tigo sin cargo'            => ['TIGO EXPRESS', null, self::KIT_ADMIN],
            'HUGHES sin cargo'          => ['HUGHES COL', null, self::KIT_TECNICO],
            'minúsculas'                => ['DIRECTV', 'tecnico senior', self::KIT_TECNICO],
            'espacios'                  => ['DIRECTV', '  TECNICO SENIOR  ', self::KIT_TECNICO],
            'asesor Tigo Home largo'    => ['TIGO HOME', 'ASESOR COMERCIAL SALA DE VENTAS', self::KIT_HOME],
            'supervisor Express largo'  => ['TIGO EXPRESS', 'SUPERVISOR COMERCIAL DE SUBAGENTES', self::KIT_EXPRESS],
            'logística en minúsculas'   => ['DIRECTV', 'líder de logística', self::KIT_LOGISTICA],
        ];
    }

    #[DataProvider('cargosRaros')]
    public function test_el_cargo_se_reconoce_como_sea_que_venga_escrito(string $proyecto, ?string $cargo, array $kit): void
    {
        $r = $this->contrato($this->empleado(), ['cliente_proyecto' => $proyecto, 'cargo' => $cargo]);

        $this->assertSame($kit, $this->nombresDePrendas($this->pedidoDe($r)));
    }

    public function test_la_sede_se_reconoce_sin_importar_mayusculas(): void
    {
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $this->pedidoDe($this->contrato($this->empleado(), ['sede' => 'sede campo']));

        $this->assertSame(8, $polo->fresh()->cantidad);
    }

    public function test_el_genero_en_mayusculas_se_reconoce(): void
    {
        $empleado = $this->empleado();
        $empleado->forceFill(['genero' => 'FEMENINO'])->saveQuietly();

        $r = $this->contrato($empleado, ['cliente_proyecto' => 'TIGO EXPRESS']);

        $this->assertSame(self::KIT_EXPRESS, $this->nombresDePrendas($this->pedidoDe($r)));
        $this->assertSame(9, $this->fila('SYM TIGO EXPRESS', 'Polo Mc Azul Tigo Express', 'Femenino', '10 (M)')->cantidad);
    }

    public function test_un_error_generando_el_pedido_no_pierde_el_contrato_y_se_avisa(): void
    {
        $this->mock(\App\Services\DotacionAutoPedidoService::class, fn ($m) => $m->shouldReceive('generarPedidoParaContrato')->andThrow(new \RuntimeException('falló')));

        $r = $this->contrato($this->empleado());

        $this->assertNotNull(Contrato::find($r->json('id')));
        $r->assertJsonPath('pedido_automatico', null)
            ->assertJsonPath('pedido_automatico_motivo', fn ($m) => str_contains($m, 'error inesperado'));
    }

    public function test_sin_la_sede_central_no_se_genera_y_se_explica(): void
    {
        DB::table('sedes')->where('id', $this->centralId)->update(['nombre' => 'SYM PEREIRA VIEJA']);

        $this->contrato($this->empleado())->assertJsonPath('pedido_automatico', null)
            ->assertJsonPath('pedido_automatico_motivo', fn ($m) => str_contains($m, 'SYM PEREIRA'));
    }

    public function test_el_formulario_que_llega_despues_del_contrato_no_crea_el_pedido_solo(): void
    {
        $empleado = $this->empleado(conFormulario: false);
        $this->contrato($empleado)->assertJsonPath('pedido_automatico', null);

        $this->formularioIngreso($empleado->cedula);

        $this->assertSame(0, PedidoAutomatico::where('empleado_id', $empleado->id)->count());
    }

    // ── El contrato se corrige ───────────────────────────────────────────────

    public function test_un_no_ingreso_corregido_a_vigente_recibe_su_pedido(): void
    {
        $empleado = $this->empleado();
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $r = $this->contrato($empleado);
        $id = $r->json('id');
        $this->putJson("/api/contratos/{$id}", $this->datosContrato($empleado, ['estado_contrato' => 'No ingreso']))->assertOk();
        $this->assertSame(0, PedidoAutomatico::where('contrato_id', $id)->count());
        $this->assertSame(10, $polo->fresh()->cantidad);

        $this->putJson("/api/contratos/{$id}", $this->datosContrato($empleado))->assertOk()
            ->assertJsonPath('pedido_automatico_aviso', fn ($a) => str_contains($a, 'Se generó el pedido'));

        $this->assertSame(1, PedidoAutomatico::where('contrato_id', $id)->count());
        $this->assertSame(8, $polo->fresh()->cantidad);
    }

    public function test_volver_a_vigente_no_duplica_el_pedido_que_ya_tiene(): void
    {
        $empleado = $this->empleado();
        $id = $this->contrato($empleado)->json('id');
        $this->putJson("/api/contratos/{$id}", $this->datosContrato($empleado, ['estado_contrato' => 'Finalizado', 'motivo_finalizacion' => 'Voluntario']))->assertOk();

        $this->putJson("/api/contratos/{$id}", $this->datosContrato($empleado))->assertOk();

        $this->assertSame(1, PedidoAutomatico::where('empleado_id', $empleado->id)->count());
    }

    public function test_volver_a_vigente_respeta_la_regla_del_segundo_contrato(): void
    {
        $empleado = $this->empleado();
        $this->contrato($empleado, ['fecha_ingreso' => '2020-01-01']);
        $segundo = $this->contrato($empleado, ['estado_contrato' => 'Finalizado', 'motivo_finalizacion' => 'Voluntario'])->json('id');

        $this->putJson("/api/contratos/{$segundo}", $this->datosContrato($empleado))->assertOk()
            ->assertJsonPath('pedido_automatico_aviso', fn ($a) => str_contains($a, 'ya tuvo otro contrato'));

        $this->assertSame(1, PedidoAutomatico::where('empleado_id', $empleado->id)->count());
    }

    public function test_eliminar_el_contrato_devuelve_el_stock_y_al_crearlo_de_nuevo_hay_pedido(): void
    {
        $empleado = $this->empleado();
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $id = $this->contrato($empleado)->json('id');
        $this->assertSame(8, $polo->fresh()->cantidad);

        $this->deleteJson("/api/contratos/{$id}")->assertNoContent();
        $this->assertSame(10, $polo->fresh()->cantidad);
        $this->assertSame(0, PedidoAutomatico::where('empleado_id', $empleado->id)->count());

        $this->pedidoDe($this->contrato($empleado));
        $this->assertSame(8, $polo->fresh()->cantidad);
    }

    public function test_eliminar_otro_contrato_de_la_persona_no_toca_su_pedido_ni_el_stock(): void
    {
        $empleado = $this->empleado();
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $pedido = $this->pedidoDe($this->contrato($empleado));
        $segundo = $this->contrato($empleado)->json('id');

        $this->deleteJson("/api/contratos/{$segundo}")->assertNoContent();

        $this->assertSame('Activo', $pedido->fresh()->estado);
        $this->assertSame(8, $polo->fresh()->cantidad);
    }

    // ── La ficha del empleado se completa después del contrato ───────────────

    /** Proceso Contratos > Importar Excel: la persona entra sin género, antes de darle el alta. */
    private function ingresoPorDocumentoSinGenero(string $documento, array $extra = [])
    {
        $this->formularioIngreso($documento);

        return $this->postJson('/api/contratos', $extra + [
            'documento' => $documento, 'nombres' => 'LUZ', 'apellidos' => 'MORA', 'tipo_contrato' => 'Indefinido', 'cargo' => 'ASESOR COMERCIAL',
            'sede' => self::SEDE, 'fecha_ingreso' => '2026-11-01', 'salario' => 2000000, 'estado_contrato' => 'Vigente', 'cliente_proyecto' => 'DIRECTV',
        ])->assertCreated();
    }

    public function test_sin_genero_el_pedido_queda_incompleto_y_marcado(): void
    {
        $pedido = $this->pedidoDe($this->ingresoPorDocumentoSinGenero('66001'));

        $this->assertSame(['Carnet'], $this->nombresDePrendas($pedido));
        $this->assertSame(['Polo Gris Administrativa', 'Pantalon Comercial'], $pedido->prendas_sin_definir);
    }

    public function test_al_importar_la_ficha_con_el_genero_el_pedido_se_completa(): void
    {
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Femenino', 'M');
        $pedido = $this->pedidoDe($this->ingresoPorDocumentoSinGenero('66002'));
        $this->assertSame(10, $polo->fresh()->cantidad);

        $this->postJson('/api/empleados/importar-datos-personales', ['filas' => [['cedula' => '66002', 'genero' => 'Femenino']]])->assertOk();

        $fresco = $pedido->fresh();
        $this->assertSame(self::KIT_ASESOR_DTV, $this->nombresDePrendas($fresco));
        $this->assertNull($fresco->prendas_sin_definir);
        $this->assertStringNotContainsString('no tiene género', $fresco->notas);
        $this->assertSame(8, $polo->fresh()->cantidad, 'Las 2 polos salen del inventario una sola vez.');
    }

    public function test_al_guardar_el_empleado_con_el_genero_el_pedido_se_completa_una_sola_vez(): void
    {
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $pedido = $this->pedidoDe($this->ingresoPorDocumentoSinGenero('66003'));
        $empleado = User::where('cedula', '66003')->first();

        $empleado->update(['genero' => 'Masculino']);
        $empleado->update(['genero' => 'Femenino']);

        $this->assertCount(3, $pedido->fresh()->items, 'No agrega otro kit al corregir el género.');
        $this->assertSame(8, $polo->fresh()->cantidad);
    }

    public function test_un_genero_que_sigue_sin_prendas_propias_no_completa_nada(): void
    {
        $pedido = $this->pedidoDe($this->ingresoPorDocumentoSinGenero('66004'));

        User::where('cedula', '66004')->first()->update(['genero' => 'Otro']);

        $this->assertSame(['Carnet'], $this->nombresDePrendas($pedido->fresh()));
        $this->assertNotNull($pedido->fresh()->prendas_sin_definir);
    }

    public function test_al_llegar_la_talla_solo_se_agrega_esa_prenda(): void
    {
        $empleado = $this->empleado(tallasFormulario: ['talla_camisa' => '']);
        $pedido = $this->pedidoDe($this->contrato($empleado));
        $this->assertSame(['Carnet', 'Pantalon Comercial'], $this->nombresDePrendas($pedido));
        $pantalon = $this->fila('DIRECTV', 'Pantalon Comercial', 'Masculino', '32')->fresh()->cantidad;

        $empleado->update(['talla_camisa' => 'M']);

        $this->assertSame(self::KIT_ASESOR_DTV, $this->nombresDePrendas($pedido->fresh()));
        $this->assertNull($pedido->fresh()->prendas_sin_definir);
        $this->assertSame($pantalon, $this->fila('DIRECTV', 'Pantalon Comercial', 'Masculino', '32')->fresh()->cantidad);
    }

    public function test_si_al_completar_no_hay_stock_la_prenda_entra_por_comprar(): void
    {
        $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 1);
        $pedido = $this->pedidoDe($this->ingresoPorDocumentoSinGenero('66005'));

        User::where('cedula', '66005')->first()->update(['genero' => 'Masculino']);

        $linea = $pedido->fresh()->items()->whereHas('inventario', fn ($q) => $q->where('prenda', 'Polo Gris Administrativa'))->first();
        $this->assertSame(2, $linea->cantidad);
        $this->assertSame(1, $linea->cantidad_por_comprar);
        $this->assertSame(0, $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M')->cantidad);
    }

    public function test_un_pedido_cancelado_no_se_completa(): void
    {
        $pedido = $this->pedidoDe($this->ingresoPorDocumentoSinGenero('66006'));
        DB::transaction(fn () => $pedido->fresh()->cambiarEstado('Cancelado'));

        User::where('cedula', '66006')->first()->update(['genero' => 'Masculino']);

        $this->assertCount(0, $pedido->fresh()->items);
    }

    public function test_no_se_confirma_la_entrega_de_un_pedido_con_prendas_sin_definir(): void
    {
        $pedido = $this->pedidoDe($this->ingresoPorDocumentoSinGenero('66007', ['regional_id' => $this->regional()]));
        $global = $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->assertCreated()->json('global.id');

        $this->putJson("/api/pedidos-globales/{$global}", ['confirmado' => true, 'entrega_confirmada' => true])->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'género') && str_contains($m, $pedido->codigo));

        // Ya dentro del global, llega el género: se completa y se puede entregar.
        User::where('cedula', '66007')->first()->update(['genero' => 'Masculino']);
        $this->assertSame(self::KIT_ASESOR_DTV, $this->nombresDePrendas($pedido->fresh()));
        $this->putJson("/api/pedidos-globales/{$global}", ['confirmado' => true, 'entrega_confirmada' => true])->assertOk();
    }

    public function test_agregar_a_mano_lo_que_faltaba_quita_la_marca_solo_de_esa_prenda(): void
    {
        $pedido = $this->pedidoDe($this->ingresoPorDocumentoSinGenero('66008'));
        $empleado = User::where('cedula', '66008')->first();
        $items = $this->itemsDe($pedido);
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $datos = ['empleado_id' => $empleado->id, 'estado' => 'Activo'];
        $this->putJson("/api/pedidos-automaticos/{$pedido->id}", $datos + ['items' => $items])->assertOk();
        $this->assertSame(['Polo Gris Administrativa', 'Pantalon Comercial'], $pedido->fresh()->prendas_sin_definir, 'Guardar sin agregarla no la quita.');

        $this->putJson("/api/pedidos-automaticos/{$pedido->id}", $datos + ['items' => [...$items, ['inventario_dotacion_id' => $polo->id, 'cantidad' => 2]]])->assertOk();
        $this->assertSame(['Pantalon Comercial'], $pedido->fresh()->prendas_sin_definir);
    }

    public function test_cambiar_de_proyecto_recalcula_lo_que_queda_sin_definir(): void
    {
        $r = $this->ingresoPorDocumentoSinGenero('66009');
        $pedido = $this->pedidoDe($r);
        $empleado = User::where('cedula', '66009')->first();

        // HUGHES tiene un solo kit, sin género: ya no le falta nada por definir.
        $this->putJson('/api/contratos/' . $r->json('id'), $this->datosContrato($empleado, ['cliente_proyecto' => 'HUGHES COL']))->assertOk();

        $this->assertNull($pedido->fresh()->prendas_sin_definir);
        $this->assertSame(self::KIT_TECNICO, $this->nombresDePrendas($pedido->fresh()));
    }

    // ── Cargas masivas ───────────────────────────────────────────────────────

    /** Empleado con contrato vigente y otro finalizado (más nuevo o más viejo), sin kit. */
    private function empleadoConDosContratos(int $i): array
    {
        $empleado = $this->empleado(['cedula' => (string) (800000 + $i)], conFormulario: false);
        $crear = fn (string $estado, string $fecha) => Contrato::create([
            'empleado_id' => $empleado->id, 'estado_contrato' => $estado, 'fecha_ingreso' => $fecha, 'completado' => true,
            'cliente_proyecto' => 'DIRECTV', 'cargo' => 'ASESOR COMERCIAL', 'sede' => self::SEDE,
        ])->id;

        if ($i % 2 === 0) {
            $vigente = $crear('Vigente', '2025-01-01');
            $crear('Finalizado', '2026-06-01'); // el finalizado es el más reciente
        } else {
            $crear('Finalizado', '2020-01-01');
            $vigente = $crear('Vigente', '2026-06-01');
        }

        return [$empleado, $vigente];
    }

    public function test_importar_masivamente_1500_items_crea_y_luego_suma(): void
    {
        $tallas = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '6 (XS)', '8 (S)', '10 (M)', '12 (L)', '14 (XL)', '16 (2XL)', '18 (3XL)', '20 (4XL)'];
        $items = [];
        foreach (range(1, 50) as $p) {
            foreach (['Masculino', 'Femenino'] as $genero) {
                foreach ($tallas as $talla) {
                    $items[] = ['proyecto' => 'DIRECTV', 'sede_id' => $this->sedeId, 'prenda' => "Prenda Masiva {$p}", 'genero' => $genero, 'talla' => $talla, 'cantidad' => 3, 'stock_minimo' => 10];
                }
            }
        }
        $this->assertCount(1500, $items);
        $base = InventarioDotacion::query();

        $this->postJson('/api/inventario-dotacion/import', ['items' => $items])->assertOk()->assertJson(['creados' => 1500, 'actualizados' => 0]);
        $this->assertSame(1500, (clone $base)->where('prenda', 'like', 'Prenda Masiva%')->count());
        $this->assertSame(4500, (int) (clone $base)->where('prenda', 'like', 'Prenda Masiva%')->sum('cantidad'));

        $this->postJson('/api/inventario-dotacion/import', ['items' => $items])->assertOk()->assertJson(['creados' => 0, 'actualizados' => 1500]);
        $this->assertSame(1500, (clone $base)->where('prenda', 'like', 'Prenda Masiva%')->count(), 'No duplica filas.');
        $this->assertSame(9000, (int) (clone $base)->where('prenda', 'like', 'Prenda Masiva%')->sum('cantidad'));

        // Y se exportan todos con su sede.
        $exportado = collect($this->getJson('/api/inventario-dotacion?' . http_build_query(['proyecto' => 'DIRECTV', 'search' => 'Prenda Masiva']))->assertOk()->json());
        $this->assertCount(1500, $exportado);
        $this->assertSame([self::SEDE], $exportado->pluck('sede_nombre')->unique()->values()->all());
    }

    public function test_una_sola_fila_mala_no_deja_la_importacion_de_items_a_medias(): void
    {
        $bueno = $this->datosItem();
        $malo = $this->datosItem(['talla' => 'L', 'genero' => 'Otro']);

        $this->postJson('/api/inventario-dotacion/import', ['items' => [$bueno, $malo]])->assertStatus(422)->assertJsonValidationErrors('items.1.genero');

        $this->assertSame(0, InventarioDotacion::where('prenda', 'Chaqueta Nueva')->count());
    }

    public function test_importar_masivamente_pedidos_los_liga_al_contrato_vigente_de_cada_empleado(): void
    {
        $polo = $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 500);
        $carnet = $this->prenda('DIRECTV', 'Carnet', 'Masculino', 'N/A', cantidad: 500);
        $esperado = [];

        // Como la pantalla "Importar Excel": un POST por empleado.
        foreach (range(1, 150) as $i) {
            [$empleado, $vigente] = $this->empleadoConDosContratos($i);
            $items = [['inventario_dotacion_id' => $polo->id, 'cantidad' => 2], ['inventario_dotacion_id' => $carnet->id, 'cantidad' => 1]];
            $id = $this->postJson('/api/pedidos-automaticos', ['empleado_id' => $empleado->id, 'items' => $items])->assertCreated()->json('id');
            $esperado[$id] = [$empleado->id, $vigente];
        }

        foreach (PedidoAutomatico::whereIn('id', array_keys($esperado))->get() as $pedido) {
            [$empleadoId, $vigente] = $esperado[$pedido->id];
            $this->assertSame($empleadoId, $pedido->empleado_id);
            $this->assertSame($vigente, $pedido->contrato_id, "Pedido {$pedido->codigo}: debe quedar en el contrato vigente.");
            $this->assertSame($empleadoId, $pedido->contrato->empleado_id);
            $this->assertSame(2, $pedido->items()->count());
        }
        $this->assertSame(150, PedidoAutomatico::whereIn('id', array_keys($esperado))->distinct()->count('codigo'), 'Códigos únicos.');
        $this->assertSame(200, $polo->fresh()->cantidad);
        $this->assertSame(350, $carnet->fresh()->cantidad);
    }

    public function test_un_contrato_de_otro_empleado_no_se_liga_al_pedido(): void
    {
        [$empleado, $vigente] = $this->empleadoConDosContratos(1);
        [, $ajeno] = $this->empleadoConDosContratos(2);
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');

        $this->postJson('/api/pedidos-automaticos', [
            'empleado_id' => $empleado->id, 'contrato_id' => $ajeno, 'items' => [['inventario_dotacion_id' => $polo->id, 'cantidad' => 1]],
        ])->assertCreated()->assertJsonPath('contrato_id', $vigente);
    }

    public function test_importar_masivamente_un_global_liga_cada_pedido_a_su_contrato_vigente(): void
    {
        $polo = $this->prenda('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M', cantidad: 500);
        $pedidos = [];
        $vigentes = [];
        foreach (range(1, 100) as $i) {
            [$empleado, $vigente] = $this->empleadoConDosContratos($i);
            $vigentes[$empleado->id] = $vigente;
            // La mitad sin indicar contrato: igual queda ligado.
            $pedidos[] = ['empleado_id' => $empleado->id, 'contrato_id' => $i % 2 ? $vigente : null, 'items' => [['inventario_dotacion_id' => $polo->id, 'cantidad' => 1]]];
        }

        $global = $this->postJson('/api/pedidos-globales/import', ['proyecto' => 'DIRECTV', 'regional_id' => $this->regional(), 'pedidos' => $pedidos])
            ->assertCreated()->assertJsonPath('total_pedidos', 100)->json('id');

        $creados = PedidoAutomatico::where('pedido_global_id', $global)->get();
        $this->assertCount(100, $creados);
        foreach ($creados as $pedido) {
            $this->assertSame($vigentes[$pedido->empleado_id], $pedido->contrato_id);
            $this->assertSame('Completado', $pedido->estado);
        }
        $this->assertSame(400, $polo->fresh()->cantidad);
    }

    public function test_el_global_importado_rechaza_empleados_sin_contrato_y_dotacion_de_otro_proyecto(): void
    {
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $poloTigo = $this->fila('SYM TIGO EXPRESS', 'Polo Mc Azul Tigo Express', 'Masculino', 'M');
        [$conContrato] = $this->empleadoConDosContratos(1);
        $sinContrato = $this->empleado(conFormulario: false);
        $importar = fn (array $pedidos) => $this->postJson('/api/pedidos-globales/import', ['proyecto' => 'DIRECTV', 'regional_id' => $this->regional(), 'pedidos' => $pedidos]);
        $item = fn ($inv) => [['inventario_dotacion_id' => $inv->id, 'cantidad' => 1]];

        $importar([
            ['empleado_id' => $conContrato->id, 'items' => $item($polo)],
            ['empleado_id' => $sinContrato->id, 'items' => $item($polo)],
        ])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'no tiene contrato'));
        $importar([['empleado_id' => $conContrato->id, 'items' => $item($poloTigo)]])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'No corresponden'));

        // Todo o nada: el empleado bueno tampoco quedó con pedido ni descontó stock.
        $this->assertSame(0, PedidoGlobal::count());
        $this->assertSame(0, PedidoAutomatico::where('empleado_id', $conContrato->id)->count());
        $this->assertSame(10, $polo->fresh()->cantidad);
        $this->assertSame(10, $poloTigo->fresh()->cantidad);
    }

    public function test_importar_masivamente_contratos_genera_solo_los_kits_que_corresponden(): void
    {
        foreach (['Polo Gris Administrativa' => 'M', 'Pantalon Comercial' => '32', 'Carnet' => 'N/A'] as $prenda => $talla) {
            $this->prenda('DIRECTV', $prenda, 'Masculino', $talla, cantidad: 500);
        }
        $polo = $this->fila('DIRECTV', 'Polo Gris Administrativa', 'Masculino', 'M');
        $conKit = [];

        // Como "Importar Excel" de Contratos: un POST /contratos por fila.
        foreach (range(1, 120) as $i) {
            $caso = $i % 4;
            $empleado = $this->empleado(conFormulario: $caso !== 1); // 1: sin formulario
            $r = $this->contrato($empleado, ['estado_contrato' => $caso === 2 ? 'Finalizado' : 'Vigente']); // 2: histórico
            if ($caso === 3) {
                $this->contrato($empleado)->assertJsonPath('pedido_automatico', null); // 3: segundo contrato
            }
            if (in_array($caso, [0, 3], true)) {
                $conKit[$r->json('id')] = $empleado->id;
            } else {
                $r->assertJsonPath('pedido_automatico', null);
            }
        }

        $pedidos = PedidoAutomatico::all();
        $this->assertCount(60, $pedidos);
        foreach ($pedidos as $pedido) {
            $this->assertSame($conKit[$pedido->contrato_id], $pedido->empleado_id, 'Cada pedido queda en el contrato de su empleado.');
        }
        $this->assertSame(500 - 60 * 2, $polo->fresh()->cantidad);
    }

    // ── De punta a punta ─────────────────────────────────────────────────────

    public function test_circuito_completo_el_stock_total_siempre_cuadra(): void
    {
        $total = fn () => (int) InventarioDotacion::sum('cantidad');
        $inicial = $total();

        // Carga de inventario por Excel: 5 unidades más.
        $this->postJson('/api/inventario-dotacion/import', ['items' => [
            ['proyecto' => 'DIRECTV', 'sede_id' => $this->sedeId, 'prenda' => 'Polo Gris Administrativa', 'genero' => 'Masculino', 'talla' => 'M', 'cantidad' => 5, 'stock_minimo' => 10],
        ]])->assertOk();
        $this->assertSame($inicial + 5, $total());

        // Ingreso: formulario + contrato => kit de asesor (2 polos, 1 pantalón, 1 carnet).
        $pedido = $this->pedidoParaGlobal(['email' => 'a@empresa.co']);
        $this->assertSame($inicial + 5 - 4, $total());

        // Se agrupa en un pedido global, y desde allá se envía a Compras.
        $conPedido = $total();
        $global = $this->postJson('/api/pedidos-globales', ['proyecto' => 'DIRECTV'])->assertCreated()->json('global.id');
        $this->putJson('/api/pedidos-automaticos/bulk-estado', ['ids' => [$pedido->id], 'estado' => 'Enviar a compras'])->assertOk();
        $this->assertSame($conPedido, $total(), 'Agrupar y enviar a Compras no mueve el stock.');

        // Compras lo gestiona y lo regresa a Dotación.
        $this->putJson("/api/pedidos-automaticos/{$pedido->id}/estado-compra", ['estado_compra' => 'Pendiente Aprobación'])->assertOk();
        $this->putJson("/api/pedidos-automaticos/{$pedido->id}/recibido-pedidos", ['recibido' => false])->assertOk()->assertJsonPath('estado', 'Completado');

        // Se confirma y se entrega.
        $this->putJson("/api/pedidos-globales/{$global}", ['confirmado' => true, 'entrega_confirmada' => true])->assertOk();
        $this->assertSame($conPedido, $total());

        // Se devuelve: las 4 prendas vuelven.
        $this->postJson("/api/pedidos-automaticos/{$pedido->id}/devolver")->assertOk();
        $this->assertSame($conPedido + 4, $total());
    }
}
