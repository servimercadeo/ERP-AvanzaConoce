<?php

namespace Tests\Feature\Contratos;

use App\Models\Contrato;
use App\Models\InventarioDotacion;
use App\Models\PedidoAutomatico;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Administrativo > Administración de Contratos > Ver y Crear Contratos.
 */
class ContratosTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private User $empleado;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake();
        Cache::store('file')->forget('inventario-dotacion:flat');
        $this->actuarComo('th');
        $this->empleado = $this->usuario('general', [
            'cedula' => '3001', 'nombres' => 'LUIS', 'apellidos' => 'GOMEZ', 'genero' => 'Masculino',
            'talla_camisa' => 'M', 'talla_pantalon' => '32',
        ]);
    }

    private function payload(array $extra = []): array
    {
        return array_merge([
            'empleado_id' => $this->empleado->id, 'tipo_contrato' => 'Indefinido', 'cargo' => 'ANALISTA', 'sede' => 'SEDE X',
            'fecha_ingreso' => '2026-09-01', 'salario' => 2000000, 'estado_contrato' => 'Activo',
            'empresa' => 'ALTYCOM', 'cliente_proyecto' => 'HUGHES COL',
        ], $extra);
    }

    private function centrosActivos(int $n): array
    {
        return DB::table('centros_costo_catalogo')->where('activo', true)->limit($n)->pluck('id')->all();
    }

    public function test_crear_contrato_para_un_empleado_existente(): void
    {
        $r = $this->postJson('/api/contratos', $this->payload())->assertCreated();

        $r->assertJsonPath('empleado_id', $this->empleado->id)->assertJsonPath('completado', true)->assertJsonPath('estado_contrato', 'Activo');
        $this->assertDatabaseHas('contratos', ['id' => $r->json('id'), 'salario' => '2000000.00']);
    }

    public function test_crear_contrato_sincroniza_los_datos_al_empleado(): void
    {
        $this->postJson('/api/contratos', $this->payload(['salario' => 3500000, 'cargo' => 'COORDINADOR']))->assertCreated();

        $this->assertEquals(3500000, $this->empleado->fresh()->ingresos);
        $this->assertSame('COORDINADOR', $this->empleado->fresh()->cargo);
    }

    public function test_crear_contrato_por_documento_crea_el_usuario_una_sola_vez(): void
    {
        $body = $this->payload(['empleado_id' => null, 'documento' => '7770001', 'nombres' => 'Nuevo', 'apellidos' => 'Empleado', 'correo' => 'nuevo.emp@test.co']);

        $a = $this->postJson('/api/contratos', $body)->assertCreated()->json('empleado_id');
        $b = $this->postJson('/api/contratos', $body)->assertCreated()->json('empleado_id');

        $this->assertSame($a, $b);
        $this->assertSame(1, User::where('cedula', '7770001')->count());
        $u = User::where('cedula', '7770001')->first();
        $this->assertSame('NUEVO EMPLEADO', $u->name);
        $this->assertSame('nuevo.emp@test.co', $u->email);
    }

    public function test_sin_correo_se_usa_el_autogenerado_de_la_cedula(): void
    {
        $this->postJson('/api/contratos', $this->payload(['empleado_id' => null, 'documento' => '7770002', 'nombres' => 'Sin', 'apellidos' => 'Correo']))
            ->assertCreated();

        $this->assertSame('7770002@avanzaconoce.com', User::where('cedula', '7770002')->value('email'));
    }

    public function test_empleado_es_obligatorio_y_debe_existir(): void
    {
        $this->postJson('/api/contratos', $this->payload(['empleado_id' => null]))->assertStatus(422)->assertJsonValidationErrors('empleado_id');
        $this->postJson('/api/contratos', $this->payload(['empleado_id' => 999999]))->assertStatus(422)->assertJsonValidationErrors('empleado_id');
    }

    public function test_regla_empresa_proyecto_al_crear_y_al_editar(): void
    {
        $this->postJson('/api/contratos', $this->payload(['empresa' => 'SERVIMERCADEO COL', 'cliente_proyecto' => 'TIGO HOME']))
            ->assertStatus(422)->assertJsonValidationErrors('cliente_proyecto');

        $id = $this->postJson('/api/contratos', $this->payload(['empresa' => 'SERVIMERCADEO COL', 'cliente_proyecto' => 'DIRECTV CO']))->assertCreated()->json('id');

        $this->putJson("/api/contratos/$id", $this->payload(['empresa' => 'SERVIMERCADEO COL', 'cliente_proyecto' => 'TIGO EXPRESS']))
            ->assertStatus(422)->assertJsonValidationErrors('cliente_proyecto');
    }

    // ── Centros de costo ─────────────────────────────────────────────────────

    public function test_centros_de_costo_que_suman_100_se_guardan(): void
    {
        [$a, $b] = $this->centrosActivos(2);

        $r = $this->postJson('/api/contratos', $this->payload(['centros_costos' => [
            ['centro_costo_catalogo_id' => $a, 'porcentaje' => 60],
            ['centro_costo_catalogo_id' => $b, 'porcentaje' => 40],
        ]]))->assertCreated();

        $r->assertJsonCount(2, 'centros_costos');
    }

    public function test_centros_de_costo_no_pueden_superar_100_por_ciento(): void
    {
        [$a, $b] = $this->centrosActivos(2);

        $this->postJson('/api/contratos', $this->payload(['centros_costos' => [
            ['centro_costo_catalogo_id' => $a, 'porcentaje' => 70],
            ['centro_costo_catalogo_id' => $b, 'porcentaje' => 40],
        ]]))->assertStatus(422)->assertJsonValidationErrors('centros_costos');

        $this->assertDatabaseMissing('contratos', ['empleado_id' => $this->empleado->id]);
    }

    public function test_centro_de_costo_repetido_inexistente_o_inactivo_se_rechaza(): void
    {
        [$a] = $this->centrosActivos(1);
        $inactivo = DB::table('centros_costo_catalogo')->insertGetId([
            'codigo' => 'INA', 'nombre' => 'INACTIVO', 'activo' => false, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->postJson('/api/contratos', $this->payload(['centros_costos' => [
            ['centro_costo_catalogo_id' => $a, 'porcentaje' => 50], ['centro_costo_catalogo_id' => $a, 'porcentaje' => 50],
        ]]))->assertStatus(422)->assertJsonValidationErrors('centros_costos');

        $this->postJson('/api/contratos', $this->payload(['centros_costos' => [['centro_costo_catalogo_id' => 999999, 'porcentaje' => 50]]]))
            ->assertStatus(422);

        $this->postJson('/api/contratos', $this->payload(['centros_costos' => [['centro_costo_catalogo_id' => $inactivo, 'porcentaje' => 50]]]))
            ->assertStatus(422)->assertJsonValidationErrors('centros_costos');
    }

    public function test_porcentaje_de_centro_de_costo_debe_estar_entre_0_y_100(): void
    {
        [$a] = $this->centrosActivos(1);

        foreach ([0, -5, 101] as $p) {
            $this->postJson('/api/contratos', $this->payload(['centros_costos' => [['centro_costo_catalogo_id' => $a, 'porcentaje' => $p]]]))
                ->assertStatus(422);
        }
    }

    public function test_editar_reemplaza_los_centros_de_costo(): void
    {
        [$a, $b] = $this->centrosActivos(2);
        $id = $this->postJson('/api/contratos', $this->payload(['centros_costos' => [['centro_costo_catalogo_id' => $a, 'porcentaje' => 100]]]))->json('id');

        $this->putJson("/api/contratos/$id", $this->payload(['centros_costos' => [['centro_costo_catalogo_id' => $b, 'porcentaje' => 100]]]))
            ->assertOk()->assertJsonCount(1, 'centros_costos')->assertJsonPath('centros_costos.0.centro_costo_catalogo_id', $b);
    }

    // ── Listado y baja ───────────────────────────────────────────────────────

    public function test_listar_ver_y_eliminar_contratos(): void
    {
        $id = $this->postJson('/api/contratos', $this->payload())->json('id');

        $this->getJson('/api/contratos')->assertOk()->assertJsonFragment(['id' => $id]);
        $this->deleteJson("/api/contratos/$id")->assertNoContent();
        $this->assertDatabaseMissing('contratos', ['id' => $id]);
    }

    // ── Pedido automático de dotación al crear el contrato ───────────────────

    private function prepararDotacionDirectv(): array
    {
        $sedeCentral = $this->sede('SYM PEREIRA'); // exigida por el servicio
        $sede = $this->sede('SEDE DTV');
        $mk = fn (string $prenda, string $talla, int $cant) => InventarioDotacion::create([
            'proyecto' => 'DIRECTV', 'sede_id' => $sede, 'prenda' => $prenda, 'genero' => 'Masculino',
            'talla' => $talla, 'precio' => 1, 'cantidad' => $cant, 'stock_minimo' => 0,
        ]);

        return [$mk('Polo Gris Administrativa', 'M', 10), $mk('Pantalon Comercial', '32', 10), $mk('Carnet', 'N/A', 10), $sedeCentral];
    }

    public function test_un_contrato_directv_comercial_genera_su_pedido_de_dotacion_y_descuenta_stock(): void
    {
        [$polo, $pantalon, $carnet] = $this->prepararDotacionDirectv();

        $r = $this->postJson('/api/contratos', $this->payload([
            'empresa' => 'SERVIMERCADEO COL', 'cliente_proyecto' => 'DIRECTV CO', 'cargo' => 'ASESOR COMERCIAL', 'sede' => 'SEDE DTV',
        ]))->assertCreated();

        $r->assertJsonPath('pedido_automatico.estado', 'Activo');
        $this->assertSame(8, $polo->fresh()->cantidad);
        $this->assertSame(9, $pantalon->fresh()->cantidad);
        $this->assertSame(9, $carnet->fresh()->cantidad);
        $this->assertDatabaseHas('pedidos_automaticos', ['contrato_id' => $r->json('id'), 'empleado_id' => $this->empleado->id]);
    }

    public function test_si_falta_una_talla_en_inventario_el_pedido_se_genera_sin_esa_linea(): void
    {
        [$polo, $pantalon] = $this->prepararDotacionDirectv();
        $pantalon->update(['cantidad' => 0]); // sin stock de pantalón

        $r = $this->postJson('/api/contratos', $this->payload([
            'empresa' => 'SERVIMERCADEO COL', 'cliente_proyecto' => 'DIRECTV CO', 'cargo' => 'ASESOR COMERCIAL', 'sede' => 'SEDE DTV',
        ]))->assertCreated();

        $pedido = PedidoAutomatico::where('contrato_id', $r->json('id'))->first();
        $this->assertSame(2, $pedido->items()->count(), 'Solo polo y carnet: el pantalón no tenía stock.');
        $this->assertSame(0, $pantalon->fresh()->cantidad);
    }

    public function test_contrato_no_ingreso_no_genera_pedido(): void
    {
        $this->prepararDotacionDirectv();

        $this->postJson('/api/contratos', $this->payload([
            'empresa' => 'SERVIMERCADEO COL', 'cliente_proyecto' => 'DIRECTV CO', 'cargo' => 'ASESOR COMERCIAL', 'sede' => 'SEDE DTV',
            'estado_contrato' => 'No ingreso',
        ]))->assertCreated()->assertJsonPath('pedido_automatico', null);

        $this->assertDatabaseCount('pedidos_automaticos', 0);
    }

    public function test_pasar_un_contrato_a_no_ingreso_elimina_el_pedido_y_restituye_el_inventario(): void
    {
        [$polo, $pantalon, $carnet] = $this->prepararDotacionDirectv();
        $body = $this->payload(['empresa' => 'SERVIMERCADEO COL', 'cliente_proyecto' => 'DIRECTV CO', 'cargo' => 'ASESOR COMERCIAL', 'sede' => 'SEDE DTV']);
        $id = $this->postJson('/api/contratos', $body)->assertCreated()->json('id');
        $this->assertSame(8, $polo->fresh()->cantidad);

        $this->putJson("/api/contratos/$id", array_merge($body, ['estado_contrato' => 'No ingreso']))->assertOk();

        $this->assertDatabaseCount('pedidos_automaticos', 0);
        $this->assertSame(10, $polo->fresh()->cantidad);
        $this->assertSame(10, $pantalon->fresh()->cantidad);
        $this->assertSame(10, $carnet->fresh()->cantidad);
    }

    public function test_un_fallo_al_generar_la_dotacion_no_impide_crear_el_contrato(): void
    {
        // Sin la sede central administrativa el servicio no puede generar el pedido, pero el
        // contrato (lo importante) debe quedar guardado.
        $this->postJson('/api/contratos', $this->payload([
            'empresa' => 'SERVIMERCADEO COL', 'cliente_proyecto' => 'DIRECTV CO', 'cargo' => 'ASESOR COMERCIAL',
        ]))->assertCreated()->assertJsonPath('pedido_automatico', null);

        $this->assertSame(1, Contrato::where('empleado_id', $this->empleado->id)->count());
    }
}
