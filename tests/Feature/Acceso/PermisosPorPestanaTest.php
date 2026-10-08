<?php

namespace Tests\Feature\Acceso;

use App\Models\PermisoDenegado;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class PermisosPorPestanaTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    /** Lo que carga cada pestaña al abrirse (GET), sacado del código de cada pantalla. */
    private const PESTANAS = [
        'empleados.empleados_file'                    => ['/api/empleados'],
        'seleccion.proceso_seleccion'                 => ['/api/requisiciones', '/api/seleccion/catalogos'],
        'seleccion.candidatos'                        => ['/api/candidatos', '/api/requisiciones'],
        'seleccion.base_ingreso'                      => ['/api/base-ingresos', '/api/candidatos'],
        'admin_contratos.avales_contratacion'         => ['/api/base-ingresos'],
        'admin_contratos.respuestas_formulario'       => ['/api/respuestas-ingresos'],
        'admin_contratos.ver_crear_contratos'         => ['/api/contratos', '/api/empleados', '/api/respuestas-ingresos/datos-contrato', '/api/documentos-contratacion/docs-medicos?cedula=1'],
        'admin_contratos.Seguros_medicos'             => ['/api/contratos', '/api/empleados', '/api/documentos-empleado', '/api/documentos-contratacion/docs-medicos?cedula=1'],
        'admin_contratos.centros_costos_catalogo'     => ['/api/centros-costo-catalogo'],
    ];

    public function test_quitar_una_pestana_no_rompe_las_demas(): void
    {
        foreach (array_keys(self::PESTANAS) as $quitada) {
            PermisoDenegado::where('rol', 'th')->delete();
            [$sub, $archivo] = explode('.', $quitada);
            PermisoDenegado::create(['rol' => 'th', 'modulo_id' => 'administrativo', 'submodulo_id' => $sub, 'archivo_id' => $archivo]);

            $this->actuarComo('th');
            foreach (self::PESTANAS as $pestana => $rutas) {
                if ($pestana === $quitada) continue;
                foreach ($rutas as $ruta) {
                    $status = $this->getJson($ruta)->status();
                    $this->assertSame(200, $status, "Sin '$quitada', la pestaña '$pestana' falla en $ruta ($status)");
                }
            }
        }
    }

    public function test_cada_rol_con_su_matriz_actual_entra_a_lo_que_ve_en_el_menu(): void
    {
        foreach (['admin', 'th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general'] as $rol) {
            $user = $this->actuarComo($rol);
            foreach (self::PESTANAS as $pestana => $rutas) {
                [$sub, $archivo] = explode('.', $pestana);
                $visible = PermisoDenegado::permite($user, 'administrativo', $sub, $archivo);
                foreach ($rutas as $ruta) {
                    $status = $this->getJson($ruta)->status();
                    $this->assertTrue($status < 500, "$rol: $ruta dio $status");
                    if ($visible) {
                        $this->assertSame(200, $status, "$rol ve '$pestana' pero $ruta da $status");
                    }
                }
            }
            foreach (['/api/permisos', '/api/auditoria'] as $ruta) {
                $esperado = PermisoDenegado::permite($user, 'permisos', $ruta === '/api/permisos' ? 'roles_permisos' : 'auditoria') ? 200 : 403;
                $this->assertSame($esperado, $this->getJson($ruta)->status(), "$rol: $ruta");
            }
        }
    }

    public function test_rol_sin_administrativo_no_ve_ningun_dato(): void
    {
        $this->actuarComo('operaciones');
        foreach (['/api/requisiciones', '/api/candidatos', '/api/base-ingresos', '/api/contratos', '/api/respuestas-ingresos', '/api/documentos-empleado'] as $ruta) {
            $this->getJson($ruta)->assertForbidden();
        }
    }
}
