<?php

namespace Tests\Feature\Acceso;

use App\Models\PermisoDenegado;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class PermisosPorAccionTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private function negar(string $submodulo, string $archivo, string $accion): void
    {
        PermisoDenegado::create([
            'rol' => 'th', 'modulo_id' => 'administrativo', 'submodulo_id' => $submodulo,
            'archivo_id' => $archivo, 'accion' => $accion,
        ]);
    }

    // Un POST vacío pasa el permiso y se queda en la validación (422); sin permiso, 403.
    public function test_negar_crear_bloquea_solo_crear_y_la_pestana_se_sigue_viendo(): void
    {
        PermisoDenegado::where('rol', 'th')->delete();
        $this->negar('empleados', '', 'crear');
        $this->actuarComo('th');

        $this->getJson('/api/empleados')->assertOk();
        $this->postJson('/api/empleados', [])->assertForbidden();
        $this->postJson('/api/empleados/importar-datos-personales', [])->assertUnprocessable();
    }

    public function test_negar_importar_no_toca_crear(): void
    {
        PermisoDenegado::where('rol', 'th')->delete();
        $this->negar('empleados', '', 'importar');
        $this->negar('admin_contratos', 'ver_crear_contratos', 'importar');
        $this->actuarComo('th');

        $this->postJson('/api/empleados/importar-datos-personales', [])->assertForbidden();
        $this->postJson('/api/contratos/importar-datos-faltantes', [])->assertForbidden();
        $this->postJson('/api/empleados', [])->assertUnprocessable();
        $this->postJson('/api/contratos', [])->assertUnprocessable();
    }

    public function test_quien_solo_importa_contratos_puede_crearlos_desde_el_excel(): void
    {
        PermisoDenegado::where('rol', 'th')->delete();
        $this->negar('admin_contratos', 'ver_crear_contratos', 'crear');
        $this->actuarComo('th');

        $this->postJson('/api/contratos', [])->assertUnprocessable();

        $this->negar('admin_contratos', 'ver_crear_contratos', 'importar');
        $this->postJson('/api/contratos', [])->assertForbidden();
        $this->getJson('/api/contratos')->assertOk();
    }

    public function test_una_accion_negada_no_oculta_la_pestana_y_admin_no_se_ve_afectado(): void
    {
        PermisoDenegado::where('rol', 'th')->delete();
        $this->negar('empleados', '', 'eliminar');
        $th = $this->usuario('th');

        $this->assertTrue(PermisoDenegado::permite($th, 'administrativo', 'empleados'));
        $this->assertFalse(PermisoDenegado::permite($th, 'administrativo', 'empleados', null, 'eliminar'));
        $this->assertTrue(PermisoDenegado::permite($th, 'administrativo', 'empleados', null, 'editar'));
        $this->assertTrue(PermisoDenegado::permite($this->usuario('admin'), 'administrativo', 'empleados', null, 'eliminar'));
    }

    /** Ruta de alta/importación => [acción, ...destinos "módulo.submódulo"] (todos deben negarse para cerrarla). */
    private const ALTAS = [
        '/api/sedes'                       => ['crear', 'sedes._modulo'],
        '/api/regionales'                  => ['crear', 'parametros.regionales'],
        '/api/empresas'                    => ['crear', 'parametros.empresas'],
        '/api/empleadores'                 => ['crear', 'parametros.empleadores'],
        '/api/proyectos'                   => ['crear', 'parametros.proyectos'],
        '/api/proveedores'                 => ['crear', 'parametros.proveedores'],
        '/api/clases-pedido'               => ['crear', 'parametros.clases_pedido'],
        '/api/conceptos-pedido'            => ['crear', 'parametros.conceptos_pedido'],
        '/api/categorias-producto'         => ['crear', 'parametros.categoria_producto'],
        '/api/tipos-producto'              => ['crear', 'parametros.categoria_producto'],
        '/api/tipos-parametro'             => ['crear', 'parametros._modulo'],
        '/api/valores-parametro'           => ['crear', 'parametros._modulo'],
        '/api/centros-costo-catalogo'      => ['crear', 'parametros.centros_costos', 'administrativo.admin_contratos'],
        '/api/pedidos-compra'              => ['crear', 'pedidos_compras.pedidos'],
        '/api/ordenes-compra'              => ['crear', 'pedidos_compras.compras'],
        '/api/asignaciones-inventario'     => ['crear', 'inventarios.asignacion_inventario'],
        '/api/work-orders/importar'        => ['importar', 'inventarios.work_orders'],
        '/api/inventario-productos/importar' => ['importar', 'inventarios.inv_general'],
        '/api/inventario-dotacion'         => ['crear', 'inventarios.dotacion'],
        '/api/inventario-dotacion/import'  => ['importar', 'inventarios.dotacion'],
        '/api/inventario-dotacion/bulk'    => ['importar', 'inventarios.dotacion'],
        '/api/pedidos-globales'            => ['crear', 'inventarios.dotacion'],
        '/api/pedidos-globales/import'     => ['importar', 'inventarios.dotacion'],
        '/api/cronograma-dotacion'         => ['crear', 'inventarios.dotacion'],
        '/api/base-ingresos'               => ['crear', 'administrativo.seleccion'],
        '/api/requisiciones'               => ['crear', 'administrativo.seleccion'],
    ];

    public function test_cada_alta_e_importacion_respeta_su_accion(): void
    {
        foreach (self::ALTAS as $ruta => $config) {
            $accion = array_shift($config);
            $destinos = $config;
            PermisoDenegado::query()->delete();
            $this->actuarComo('th');
            $this->assertNotSame(403, $this->postJson($ruta, [])->status(), "$ruta debería estar abierta sin denegaciones");

            foreach ($destinos as $destino) {
                [$modulo, $submodulo] = explode('.', $destino);
                PermisoDenegado::create(['rol' => 'th', 'modulo_id' => $modulo, 'submodulo_id' => $submodulo, 'archivo_id' => '', 'accion' => $accion]);
            }
            $this->postJson($ruta, [])->assertForbidden();
        }
    }

    public function test_pedidos_automaticos_se_crean_con_crear_o_con_importar(): void
    {
        PermisoDenegado::query()->delete();
        $this->negarEn('inventarios', 'dotacion', 'crear');
        $this->actuarComo('th');
        $this->assertNotSame(403, $this->postJson('/api/pedidos-automaticos', [])->status());

        $this->negarEn('inventarios', 'dotacion', 'importar');
        $this->postJson('/api/pedidos-automaticos', [])->assertForbidden();
    }

    public function test_inventario_por_categoria_pide_la_accion_en_su_pestana_o_en_general(): void
    {
        PermisoDenegado::query()->delete();
        $tipo = $this->tipoProducto(null, 'Materiales');
        $sede = $this->sede();
        $item = $this->inventario($tipo, $sede, 5);
        $this->actuarComo('th');

        // Negado solo en Materiales: Inventario General todavía lo permite.
        $this->negarEn('inventarios', 'inv_materiales', 'eliminar');
        $this->negarEn('inventarios', 'inv_materiales', 'editar');
        $this->putJson("/api/inventario-productos/{$item->id}", ['cantidad' => 3])->assertOk();

        $this->negarEn('inventarios', 'inv_general', 'editar');
        $this->putJson("/api/inventario-productos/{$item->id}", ['cantidad' => 2])->assertForbidden();

        $this->negarEn('inventarios', 'inv_general', 'eliminar');
        $this->deleteJson("/api/inventario-productos/{$item->id}")->assertForbidden();

        // Otra categoría no se ve afectada por lo negado en Materiales.
        $otro = $this->inventario($this->tipoProducto(null, 'Equipos'), $sede, 1);
        PermisoDenegado::where('submodulo_id', 'inv_general')->delete();
        $this->deleteJson("/api/inventario-productos/{$otro->id}")->assertNoContent();
    }

    private function negarEn(string $modulo, string $submodulo, string $accion): void
    {
        PermisoDenegado::create(['rol' => 'th', 'modulo_id' => $modulo, 'submodulo_id' => $submodulo, 'archivo_id' => '', 'accion' => $accion]);
    }

    public function test_sync_guarda_las_acciones_y_las_devuelve_en_la_sesion(): void
    {
        $this->actuarComo('admin');
        $this->putJson('/api/permisos', ['denegados' => [
            ['rol' => 'th', 'modulo_id' => 'administrativo', 'submodulo_id' => 'empleados', 'accion' => 'eliminar'],
            ['rol' => 'th', 'modulo_id' => 'administrativo', 'submodulo_id' => 'empleados', 'accion' => 'eliminar'],
        ]])->assertOk()->assertJsonCount(1);

        $this->putJson('/api/permisos', ['denegados' => [
            ['rol' => 'th', 'modulo_id' => 'administrativo', 'submodulo_id' => 'empleados', 'accion' => 'volar'],
        ]])->assertUnprocessable();

        $this->actuarComo('th');
        $this->getJson('/api/user')->assertJsonFragment([
            'modulo_id' => 'administrativo', 'submodulo_id' => 'empleados', 'archivo_id' => '', 'accion' => 'eliminar',
        ]);
    }
}
