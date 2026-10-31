<?php

namespace Tests\Feature\Acceso;

use App\Models\Aliado;
use App\Models\PermisoDenegado;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\UsuarioAliadoEmpresa;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * La matriz de Permisos tiene una pestaña por tipo de aliado (aliado empresa, técnico de
 * aliado empresa, aliado / técnico indirecto), aparte del técnico directo: lo que ve cada
 * uno se decide ahí, no en el código.
 */
class PerfilesAliadosTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private User $directo;
    private User $deEmpresa;
    private User $indirecto;
    private User $usuarioEmpresa;
    private Aliado $empresa;
    private Aliado $aliadoIndirecto;

    protected function setUp(): void
    {
        parent::setUp();
        $this->empresa = Aliado::create(['tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900111222-3', 'nombre' => 'EMPRESA SAS',
            'telefono' => '3001112233', 'correo' => 'gerencia@empresa.co', 'activo' => true]);
        app(UsuarioAliadoEmpresa::class)->asegurar($this->empresa);
        $this->empresa->refresh();
        $this->usuarioEmpresa = User::findOrFail($this->empresa->usuario_id);
        $this->aliadoIndirecto = Aliado::create(['tipo' => 'tecnico', 'tipo_documento' => 'CC', 'documento' => '3003', 'nombre' => 'PEDRO PEREZ']);

        $this->directo = $this->usuario('tecnico', ['cedula' => '1001']);
        $this->deEmpresa = $this->usuario('tecnico', ['cedula' => '2002', 'aliado_id' => $this->empresa->id]);
        $this->indirecto = $this->usuario('tecnico', ['cedula' => '3003', 'aliado_id' => $this->aliadoIndirecto->id]);
        foreach (['1001', '2002', '3003'] as $cedula) {
            WorkOrder::create(['numero_wo' => "WO-{$cedula}", 'numero_item' => '1', 'cedula_tecnico' => $cedula, 'estado' => 'Atendido']);
        }
    }

    public function test_cada_tipo_de_usuario_usa_su_pestana_de_la_matriz(): void
    {
        $this->assertSame('tecnico', PermisoDenegado::perfilDe($this->directo));
        $this->assertSame('tecnico_aliado', PermisoDenegado::perfilDe($this->deEmpresa));
        $this->assertSame('tecnico_indirecto', PermisoDenegado::perfilDe($this->indirecto));
        $this->assertSame('aliado', PermisoDenegado::perfilDe($this->usuarioEmpresa));
        // Siguen siendo técnicos (su rol no cambia: AvanzaConoce, vehículos... lo usan).
        $this->assertSame(['tecnico', 'tecnico'], [$this->deEmpresa->rol, $this->indirecto->rol]);
    }

    public function test_arrancan_con_lo_que_veian_antes(): void
    {
        $ve = fn (User $u, string $sub, string $accion = '') => PermisoDenegado::permite($u, 'operaciones', $sub, null, $accion);

        // Técnico directo: Work Orders (y editarlas), no Aliados.
        $this->assertTrue($ve($this->directo, 'work_orders'));
        $this->assertTrue($ve($this->directo, 'work_orders', 'editar'));
        $this->assertFalse($ve($this->directo, 'aliados'));

        // Técnicos de aliados: su ficha (sin crear/editar/eliminar), no Work Orders; lo demás como el directo.
        foreach ([$this->deEmpresa, $this->indirecto] as $tec) {
            $this->assertFalse($ve($tec, 'work_orders'));
            $this->assertTrue($ve($tec, 'aliados'));
            $this->assertFalse($ve($tec, 'aliados', 'editar'));
            $this->assertFalse(PermisoDenegado::permite($tec, 'administrativo', 'empleados'), 'Copia las restricciones del técnico');
        }

        // Aliado empresa: solo su ficha.
        $this->assertTrue($ve($this->usuarioEmpresa, 'aliados'));
        $this->assertFalse($ve($this->usuarioEmpresa, 'aliados', 'crear'));
        $this->assertFalse($ve($this->usuarioEmpresa, 'work_orders'));
        $this->assertFalse(PermisoDenegado::permite($this->usuarioEmpresa, 'inventarios', 'dotacion'));
        $this->assertFalse(PermisoDenegado::permite($this->usuarioEmpresa, 'sedes', PermisoDenegado::SUBMODULO_RAIZ));
        $this->assertFalse(PermisoDenegado::permite($this->usuarioEmpresa, 'parametros', 'paramgrupo_operativos'));

        // La sesión (menú) trae las reglas de su pestaña.
        $sesion = collect($this->indirecto->datosDeSesion()['permisos_denegados']);
        $this->assertTrue($sesion->contains(fn ($r) => $r['submodulo_id'] === 'work_orders' && $r['accion'] === ''));
    }

    public function test_desde_la_matriz_se_cambia_lo_que_ve_cada_uno(): void
    {
        $this->actuarComo('admin');
        $filas = collect($this->getJson('/api/permisos')->assertOk()->json());

        // Al aliado indirecto se le abre Work Orders con Editar; al aliado empresa se le quita su ficha.
        $nuevas = $filas
            ->reject(fn ($f) => $f['rol'] === 'tecnico_indirecto' && $f['modulo_id'] === 'operaciones' && $f['submodulo_id'] === 'work_orders')
            ->push(['rol' => 'aliado', 'modulo_id' => 'operaciones', 'submodulo_id' => 'aliados', 'archivo_id' => '', 'accion' => ''])
            ->values()->all();
        $this->putJson('/api/permisos', ['denegados' => $nuevas])->assertOk();

        // El indirecto ve sus WO (solo las suyas) en el módulo y puede cambiarles el estado.
        $this->actingAs($this->indirecto->fresh());
        $wos = collect($this->getJson('/api/work-orders')->assertOk()->json());
        $this->assertSame(['WO-3003'], $wos->pluck('numero_wo')->all());
        $suya = WorkOrder::where('cedula_tecnico', '3003')->firstOrFail();
        $this->putJson("/api/work-orders/{$suya->id}", ['estado' => 'Finalizado'])->assertOk();
        $ajena = WorkOrder::where('cedula_tecnico', '1001')->firstOrFail();
        $this->putJson("/api/work-orders/{$ajena->id}", ['estado' => 'Finalizado'])->assertNotFound();

        // El técnico de la empresa sigue igual (otra pestaña).
        $this->actingAs($this->deEmpresa->fresh());
        $this->getJson('/api/work-orders')->assertForbidden();

        // El aliado empresa ya no ve su ficha.
        $this->actingAs($this->usuarioEmpresa->fresh());
        $this->getJson('/api/aliados?page=1')->assertForbidden();
        $this->getJson("/api/aliados/{$this->empresa->id}")->assertForbidden();
    }

    public function test_un_aliado_con_mas_permisos_igual_solo_toca_lo_suyo(): void
    {
        // Matriz: al aliado empresa y al técnico indirecto se les da todo en Aliados y Work Orders.
        PermisoDenegado::whereIn('rol', ['aliado', 'tecnico_indirecto'])->where('modulo_id', 'operaciones')->delete();
        $otraEmpresa = Aliado::create(['tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '800999888-1', 'nombre' => 'OTRA SAS']);

        $this->actingAs($this->usuarioEmpresa);
        $this->assertSame(['WO-2002'], collect($this->getJson('/api/work-orders')->assertOk()->json())->pluck('numero_wo')->all());
        $this->putJson("/api/aliados/{$otraEmpresa->id}", ['nombre' => 'X'])->assertNotFound();
        $this->deleteJson("/api/aliados/{$otraEmpresa->id}")->assertNotFound();
        $this->postJson('/api/aliados', ['tipo' => 'empresa'])->assertForbidden();
        $ajena = WorkOrder::where('cedula_tecnico', '1001')->firstOrFail();
        $this->deleteJson("/api/work-orders/{$ajena->id}")->assertNotFound();

        $this->actingAs($this->indirecto);
        $this->assertSame([$this->aliadoIndirecto->id], collect($this->getJson('/api/aliados?page=1')->assertOk()->json('data'))->pluck('id')->all());
        $this->getJson("/api/aliados/{$this->empresa->id}")->assertNotFound();
        $this->assertNotNull(WorkOrder::find($ajena->id));
    }
}
