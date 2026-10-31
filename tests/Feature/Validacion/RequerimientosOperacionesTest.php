<?php

namespace Tests\Feature\Validacion;

use App\Models\Aliado;
use App\Models\Contrato;
use App\Models\PedidoCompra;
use App\Models\PermisoDenegado;
use App\Models\TipoProducto;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\UsuarioAliadoEmpresa;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Validación de los requerimientos de Operaciones: pedidos de aliados, acceso a
 * AvanzaConoce por tipo de aliado, indicadores de Work Orders, supervisor, técnico directo
 * y rol operaciones.
 */
class RequerimientosOperacionesTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private Aliado $empresa;
    private User $usuarioEmpresa;
    private User $tecDeEmpresa;
    private User $indirecto;
    private User $directo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->empresa = Aliado::create(['tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900111222-3', 'nombre' => 'EMPRESA SAS',
            'telefono' => '3001112233', 'correo' => 'gerencia@empresa.co', 'activo' => true]);
        app(UsuarioAliadoEmpresa::class)->asegurar($this->empresa);
        $this->empresa->refresh();
        $this->usuarioEmpresa = User::findOrFail($this->empresa->usuario_id);
        $this->tecDeEmpresa = $this->usuario('tecnico', ['cedula' => '2002', 'name' => 'TEC EMPRESA', 'aliado_id' => $this->empresa->id]);
        $aliadoIndirecto = Aliado::create(['tipo' => 'tecnico', 'tipo_documento' => 'CC', 'documento' => '3003', 'nombre' => 'PEDRO PEREZ', 'activo' => true]);
        $this->indirecto = $this->usuario('tecnico', ['cedula' => '3003', 'name' => 'PEDRO PEREZ', 'aliado_id' => $aliadoIndirecto->id]);
        $this->directo = $this->usuario('tecnico', ['cedula' => '1001', 'name' => 'TEC DIRECTO']);
    }

    private function pedido(array $extra = []): array
    {
        $tipo = TipoProducto::firstOrCreate(['nombre' => 'CABLE COAXIAL'], ['categoria' => 'Materiales']);
        return array_merge(['tipo_responsable' => 'Empleado', 'responsable' => 'ALGUIEN', 'sede' => 'SEDE MEDELLIN', 'clase' => 'Oficina', 'concepto' => 'Reposición',
            'items' => [['tipo_producto_id' => $tipo->id, 'cantidad' => 2]]], $extra);
    }

    // ── Aliados: sin Inventarios ni pedidos de la empresa; crean pedidos y ven solo los suyos ──

    public function test_aliados_no_ven_inventarios_ni_compras_pero_si_crean_pedidos(): void
    {
        foreach ([$this->usuarioEmpresa, $this->tecDeEmpresa, $this->indirecto] as $u) {
            $perfil = PermisoDenegado::perfilDe($u);
            foreach (['dotacion', 'inv_activos', 'inv_materiales', 'inv_general', 'asignacion_inventario', 'inventario_empleado'] as $sub) {
                $this->assertFalse(PermisoDenegado::permite($u, 'inventarios', $sub), "{$perfil} no ve Inventarios > {$sub}");
            }
            $this->assertFalse(PermisoDenegado::permite($u, 'pedidos_compras', 'compras'), "{$perfil} no ve Compras");
            $this->assertFalse(PermisoDenegado::permite($u, 'pedidos_compras', 'asignacion_pedidos'), "{$perfil} no ve Asignación de Pedidos");
            $this->assertTrue(PermisoDenegado::permite($u, 'pedidos_compras', 'pedidos', 'ver_crear_pedidos'), "{$perfil} ve Pedidos");
            $this->assertTrue(PermisoDenegado::permite($u, 'pedidos_compras', 'pedidos', 'ver_crear_pedidos', 'crear'), "{$perfil} crea pedidos");
            $this->assertFalse(PermisoDenegado::permite($u, 'pedidos_compras', 'pedidos', 'ver_crear_pedidos', 'editar'), "{$perfil} no edita pedidos");
        }
        // El técnico directo sigue igual.
        $this->assertTrue(PermisoDenegado::permite($this->directo, 'inventarios', 'dotacion'));
    }

    public function test_cada_aliado_ve_solo_sus_pedidos_y_pide_a_nombre_de_su_aliado(): void
    {
        $this->actuarComo('admin');
        $this->postJson('/api/pedidos-compra', $this->pedido(['responsable' => 'EMPLEADO DE LA EMPRESA']))->assertCreated();
        // Admin con responsable tipo Aliado: queda enlazado al aliado real.
        $r = $this->postJson('/api/pedidos-compra', $this->pedido(['tipo_responsable' => 'Aliado', 'responsable' => 'empresa sas']))->assertCreated();
        $this->assertSame($this->empresa->id, PedidoCompra::find($r->json('id'))->aliado_id);

        // El técnico de la empresa pide: aunque mande otro responsable, queda a nombre de su aliado.
        $this->actingAs($this->tecDeEmpresa);
        $delTecnico = $this->postJson('/api/pedidos-compra', $this->pedido(['responsable' => 'OTRA PERSONA']))->assertCreated()
            ->assertJsonPath('tipo_responsable', 'Aliado')->assertJsonPath('responsable', 'EMPRESA SAS')->json('id');
        $this->assertSame([$delTecnico], collect($this->getJson('/api/pedidos-compra')->assertOk()->json())->pluck('id')->all(), 'El técnico ve solo los que él registró');

        // El indirecto pide y ve solo el suyo.
        $this->actingAs($this->indirecto);
        $delIndirecto = $this->postJson('/api/pedidos-compra', $this->pedido())->assertCreated()->assertJsonPath('responsable', 'PEDRO PEREZ')->json('id');
        $this->assertSame([$delIndirecto], collect($this->getJson('/api/pedidos-compra')->json())->pluck('id')->all());
        $this->getJson("/api/pedidos-compra/{$delTecnico}")->assertNotFound();
        $this->assertSame(['PEDRO PEREZ'], collect($this->getJson('/api/pedidos-compra/aliados')->assertOk()->json())->pluck('nombre')->all());

        // El aliado empresa: los de su aliado (el del admin a su nombre y el de su técnico), no los de la empresa.
        $this->actingAs($this->usuarioEmpresa);
        $suyo = $this->postJson('/api/pedidos-compra', $this->pedido())->assertCreated()->json('id');
        $ids = collect($this->getJson('/api/pedidos-compra')->assertOk()->json())->pluck('id')->sort()->values()->all();
        $this->assertSame(collect([$r->json('id'), $delTecnico, $suyo])->sort()->values()->all(), $ids);
        $this->getJson("/api/pedidos-compra/{$delIndirecto}")->assertNotFound();
        // Catálogos que usa la pantalla de pedidos.
        foreach (['/api/clases-pedido', '/api/conceptos-pedido', '/api/tipos-producto', '/api/pedidos-automaticos'] as $url) {
            $this->getJson($url)->assertOk();
        }
        // No puede editar ni eliminar (matriz) ni ver inventarios.
        $this->putJson("/api/pedidos-compra/{$suyo}", ['estado' => 'Aprobado'])->assertForbidden();
        $this->deleteJson("/api/pedidos-compra/{$suyo}")->assertForbidden();
        $this->getJson('/api/inventario-productos')->assertForbidden();

        // Admin ve todos.
        $this->actuarComo('admin');
        $this->assertSame(5, count($this->getJson('/api/pedidos-compra')->json()));
    }

    // ── AvanzaConoce: aliado empresa y técnico indirecto sí; técnico de aliado empresa no ──

    public function test_acceso_a_avanzaconoce_por_tipo_de_aliado(): void
    {
        config(['sso.crear_usuarios_en_avanza' => true, 'sso.avanzaconoce_api_url' => 'https://avanza.test/', 'sso.secret' => 'secreto-compartido']);
        Http::fake(['https://avanza.test/api/erp/empleados' => Http::response(['id' => 99, 'ya_existia' => false], 201)]);
        DB::statement('CREATE TEMPORARY TABLE IF NOT EXISTS `modalidades_bt` (id INT PRIMARY KEY, id_bt INT, nombre VARCHAR(100))');
        DB::statement("INSERT IGNORE INTO `modalidades_bt` VALUES (3, 26359, 'ALIADO TIPO A')");
        $proyecto = \App\Models\Proyecto::firstOrCreate(['nombre' => 'DIRECTV'], ['activo' => true])->id;
        $jefe = $this->usuario('operaciones')->id;
        $this->actuarComo('admin');

        // Técnico agregado a un aliado empresa: solo ERP, nada a AvanzaConoce.
        $r = $this->postJson("/api/aliados/{$this->empresa->id}/tecnicos", [
            'cedula' => '40041', 'nombres' => 'Juan', 'apellidos' => 'Gómez', 'movil' => '3104445566', 'email' => 'juan.gomez@test.co',
        ])->assertCreated()->assertJsonPath('credenciales.de_avanza', false);
        Http::assertNothingSent();
        $tecnico = User::where('cedula', '40041')->firstOrFail();
        // Contraseña propia del ERP (nunca "la misma de AvanzaConoce"), y con ella entra al ERP.
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check($r->json('credenciales.password'), $tecnico->password));
        $this->assertNull($tecnico->avanza_sync_estado, 'No queda pendiente de crear en AvanzaConoce');
        $this->artisan('avanza:sincronizar-usuarios')->assertSuccessful();
        Http::assertNothingSent();

        // Aliado empresa: se crea en AvanzaConoce.
        $this->postJson('/api/aliados', ['tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '901222333-1', 'nombre' => 'OTRA EMPRESA SAS',
            'telefono' => '3009998877', 'ciudad' => 'MEDELLIN', 'correo' => 'otra@empresa.co', 'direccion' => 'Calle 1', 'codigo_pdv' => '123', 'modalidad_id_bt' => 26359,
            'representante_legal_nombre' => 'Ana Ruiz', 'representante_legal_documento' => '43111222', 'proyectos' => [$proyecto], 'jefe_inmediato_id' => $jefe,
        ])->assertCreated()->assertJsonPath('credenciales.avanza.estado', 'ok');
        Http::assertSentCount(1);
        Http::assertSent(fn ($req) => $req['rol_erp'] === 'aliado');

        // Aliado / técnico indirecto: se crea en AvanzaConoce.
        $this->postJson('/api/aliados', ['tipo' => 'tecnico', 'tipo_documento' => 'CC', 'cedula' => '50051', 'nombres' => 'Luis', 'apellidos' => 'Mora',
            'movil' => '3201234567', 'email' => 'luis.mora@test.co', 'ciudad' => 'CALI', 'direccion' => 'Cra 2', 'proyectos' => [$proyecto], 'jefe_inmediato_id' => $jefe,
        ])->assertCreated()->assertJsonPath('credenciales.avanza.estado', 'ok');
        Http::assertSentCount(2);
        Http::assertSent(fn ($req) => $req['cedula'] === '50051' && $req['rol_erp'] === 'tecnico');
    }

    // ── Work Orders ──

    private function wos(): void
    {
        foreach ([['1001', 'Asignado'], ['1001', 'Atendido'], ['1001', 'Finalizado'], ['1001', 'Finalizado'], ['2002', 'Atendido'], ['8888', 'Finalizado']] as $i => [$cedula, $estado]) {
            WorkOrder::create(['numero_wo' => "WO-{$i}", 'numero_item' => '1', 'cedula_tecnico' => $cedula, 'estado' => $estado,
                'fecha_estado' => '2026-10-' . str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT) . ' 10:00:00']);
        }
    }

    public function test_tecnico_directo_ve_solo_las_suyas_con_indicadores_y_la_pasa_a_atendida(): void
    {
        $this->wos();
        $this->actingAs($this->directo);

        $this->getJson('/api/work-orders/resumen')->assertOk()
            ->assertJsonPath('indicadores', ['asignadas' => 4, 'atendidas' => 1, 'finalizadas' => 2]);
        $wos = collect($this->getJson('/api/work-orders')->json());
        $this->assertSame(['1001'], $wos->pluck('cedula_tecnico')->unique()->values()->all());

        $asignada = WorkOrder::where('cedula_tecnico', '1001')->where('estado', 'Asignado')->firstOrFail();
        $this->putJson("/api/work-orders/{$asignada->id}", ['estado' => 'Atendido'])->assertOk();
        $this->assertSame(['Atendido', '1001'], [$asignada->fresh()->estado, $asignada->fresh()->cedula_tecnico_cierre]);
        $this->getJson('/api/work-orders/resumen')->assertJsonPath('indicadores', ['asignadas' => 4, 'atendidas' => 2, 'finalizadas' => 2]);
    }

    public function test_indicadores_y_lista_respetan_el_filtro_de_fechas(): void
    {
        $this->wos();
        $this->actuarComo('operaciones');
        $q = 'fecha_desde=2026-10-02&fecha_hasta=2026-10-05';

        $this->getJson("/api/work-orders/resumen?{$q}")->assertJsonPath('indicadores', ['asignadas' => 4, 'atendidas' => 2, 'finalizadas' => 2]);
        $this->assertSame(['WO-1', 'WO-2', 'WO-3', 'WO-4'], collect($this->getJson("/api/work-orders?{$q}")->json())->pluck('numero_wo')->sort()->values()->all());
        $this->assertSame(4, $this->getJson("/api/work-orders?page=1&per_page=25&{$q}")->json('total'));
    }

    public function test_supervisor_ve_solo_las_wo_de_sus_tecnicos(): void
    {
        $this->wos();
        $sup = $this->usuario('supervisores', ['name' => 'CARLOS RUIZ', 'email' => 'carlos.ruiz@servimercadeo.com']);
        // 1001: su contrato lo tiene de jefe por correo. 2002: técnico de un aliado que él lidera.
        Contrato::create(['empleado_id' => $this->directo->id, 'cargo' => 'TECNICO', 'fecha_ingreso' => '2026-01-01', 'estado_contrato' => 'Vigente',
            'completado' => true, 'jefe_inmediato' => 'CARLOS RUIZ - carlos.ruiz@servimercadeo.com', 'jefe_inmediato_correo' => 'carlos.ruiz@servimercadeo.com']);
        $this->empresa->update(['jefe_inmediato_id' => $sup->id]);
        // 8888: técnico de otra ciudad con otro jefe (por nombre en su ficha).
        $otro = $this->usuario('tecnico', ['cedula' => '8888', 'jefe_inmediato' => 'OTRA PERSONA', 'sede' => 'SEDE CALI']);

        $this->actingAs($sup);
        $vistas = collect($this->getJson('/api/work-orders')->assertOk()->json())->pluck('cedula_tecnico')->unique()->sort()->values()->all();
        $this->assertSame(['1001', '2002'], $vistas);
        $this->getJson('/api/work-orders/resumen')->assertJsonPath('indicadores.asignadas', 5);
        $ajena = WorkOrder::where('cedula_tecnico', '8888')->firstOrFail();
        $this->putJson("/api/work-orders/{$ajena->id}", ['estado' => 'Atendido'])->assertNotFound();

        // Si el otro técnico pasa a su cargo (por nombre, como en contratos viejos), ya lo ve.
        $otro->update(['jefe_inmediato' => 'Carlos Ruiz']);
        $this->assertContains('8888', collect($this->getJson('/api/work-orders')->json())->pluck('cedula_tecnico')->all());
    }

    public function test_importar_guarda_los_materiales_del_exporte_macaw_y_el_exportar_los_devuelve(): void
    {
        $this->actuarComo('admin');
        $this->postJson('/api/work-orders/importar', ['items' => [[
            'numero_wo' => 'WO-MAT', 'numero_item' => '1', 'codigo_sl' => 'S03', 'cedula_tecnico' => '1001',
            'materiales' => ['GRAPA BLANCA' => 3, 'AMARRAS BLANCAS' => '10', 'CINTA NEGRA' => '', 'CABLE RG6 NEGRO ' => 1.5],
        ]]])->assertOk();

        $wo = WorkOrder::where('numero_wo', 'WO-MAT')->firstOrFail();
        $this->assertEquals(['GRAPA BLANCA' => 3, 'AMARRAS BLANCAS' => 10, 'CABLE RG6 NEGRO ' => 1.5], $wo->materiales, 'Solo los que traen cantidad');

        // Reimportar un archivo sin columnas de materiales no los borra.
        $this->postJson('/api/work-orders/importar', ['items' => [['numero_wo' => 'WO-MAT', 'numero_item' => '1', 'estado' => 'Finalizado']]])->assertOk();
        $this->assertSame(3, $wo->fresh()->materiales['GRAPA BLANCA']);

        // El Exportar (lista sin ?page=) los trae junto con el código SL ("Tipo Servicio").
        $fila = collect($this->getJson('/api/work-orders')->json())->firstWhere('numero_wo', 'WO-MAT');
        $this->assertSame(['S03', 3], [$fila['codigo_sl'], $fila['materiales']['GRAPA BLANCA']]);
    }

    public function test_operaciones_ve_y_gestiona_todas_las_wo(): void
    {
        $this->wos();
        $this->actuarComo('operaciones');

        $this->assertSame(6, count($this->getJson('/api/work-orders')->assertOk()->json()));
        $this->getJson('/api/work-orders/resumen')->assertJsonPath('indicadores', ['asignadas' => 6, 'atendidas' => 2, 'finalizadas' => 3]);
        $wo = WorkOrder::where('cedula_tecnico', '8888')->firstOrFail();
        $this->putJson("/api/work-orders/{$wo->id}", ['estado' => 'Atendido'])->assertOk();
        $this->assertNull($wo->fresh()->cedula_tecnico_cierre, 'Operaciones no queda como técnico que atiende');
        $this->postJson('/api/work-orders/importar', ['items' => [['numero_wo' => 'WO-NUEVA', 'numero_item' => '1', 'estado' => 'Asignado', 'cedula_tecnico' => '1001']]])->assertOk();
        $this->getJson('/api/aliados?page=1')->assertOk();
    }
}
