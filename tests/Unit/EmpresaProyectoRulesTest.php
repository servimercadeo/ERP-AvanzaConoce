<?php

namespace Tests\Unit;

use App\Services\EmpresaProyectoRules;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Regla empresa -> proyectos permitidos (Contratos, Empleados, Requisiciones, Dotación).
 * No toca base de datos.
 */
class EmpresaProyectoRulesTest extends TestCase
{
    public static function combinacionesValidas(): array
    {
        return [
            'SYM + TIGO EXPRESS'     => ['SERVICIOS Y MERCADEO COL', 'TIGO EXPRESS'],
            'SYM + TIGO HOME'        => ['SERVICIOS Y MERCADEO COL', 'TIGO HOME'],
            'SYM + ADMINISTRATIVO'   => ['SERVICIOS Y MERCADEO COL', 'ADMINISTRATIVO'],
            'SYM + nombre anterior ADMINISTRACION' => ['SERVICIOS Y MERCADEO COL', 'ADMINISTRACION'],
            'SYM + HUGHES'           => ['SERVICIOS Y MERCADEO COL', 'HUGHES COL'],
            'SYM + FT&H'             => ['SERVICIOS Y MERCADEO COL', 'FT&H'],
            'SYM + S&M ASESORES'     => ['SERVICIOS Y MERCADEO COL', 'S&M ASESORES'],
            'SYM + proyecto nuevo'   => ['SERVICIOS Y MERCADEO COL', 'PROYECTO QUE SE CREE DESPUES'],
            'Servimercadeo + DIRECTV' => ['SERVIMERCADEO COL', 'DIRECTV CO'],
            'Servimercadeo + ADMINISTRATIVO' => ['SERVIMERCADEO COL', 'ADMINISTRATIVO'],
            'Servimercadeo + nombre anterior ADMINISTRACION' => ['SERVIMERCADEO COL', 'ADMINISTRACION'],
            'ignora mayúsculas y espacios' => ['  servimercadeo col ', ' directv co '],
            'empresa no sujeta a la regla' => ['ALTYCOM', 'CUALQUIER PROYECTO'],
            'sin empresa'            => [null, 'TIGO HOME'],
            'sin proyecto'           => ['SERVIMERCADEO COL', null],
            'ambos vacíos'           => [null, null],
        ];
    }

    #[DataProvider('combinacionesValidas')]
    public function test_combinaciones_validas(?string $empresa, ?string $proyecto): void
    {
        $this->assertNull(EmpresaProyectoRules::validar($empresa, $proyecto));
    }

    public static function combinacionesInvalidas(): array
    {
        return [
            'SYM + DIRECTV'          => ['SERVICIOS Y MERCADEO COL', 'DIRECTV CO', 'elige otro proyecto'],
            'SYM + otro DIRECTV'     => ['SERVICIOS Y MERCADEO COL', 'DIRECTV ECU', 'elige otro proyecto'],
            'Servimercadeo + TIGO'   => ['SERVIMERCADEO COL', 'TIGO HOME', 'elige uno de estos proyectos: DIRECTV CO, ADMINISTRATIVO'],
            'Servimercadeo + HUGHES' => ['SERVIMERCADEO COL', 'HUGHES COL', 'elige uno de estos proyectos: DIRECTV CO, ADMINISTRATIVO'],
            'Servimercadeo + FT&H'   => ['SERVIMERCADEO COL', 'FT&H', 'elige uno de estos proyectos: DIRECTV CO, ADMINISTRATIVO'],
        ];
    }

    #[DataProvider('combinacionesInvalidas')]
    public function test_combinaciones_invalidas_devuelven_mensaje_que_orienta(string $empresa, string $proyecto, string $orientacion): void
    {
        $msg = EmpresaProyectoRules::validar($empresa, $proyecto);

        $this->assertNotNull($msg);
        $this->assertStringContainsString($proyecto, $msg);
        $this->assertStringContainsString($orientacion, $msg);
    }

    public static function empleadorEmpresaValidos(): array
    {
        return [
            'Servimercadeo + Servimercadeo COL' => ['SERVIMERCADEO', 'Servimercadeo COL'],
            'Servimercadeo + Servimercadeo EC'  => ['SERVIMERCADEO', 'SERVIMERCADEO EC'],
            'S&M + Servicios y Mercadeo COL'    => ['S&M SERVICIOS Y MERCADEO', 'Servicios y Mercadeo COL'],
            'ignora mayúsculas y espacios'      => [' servimercadeo ', ' servimercadeo col '],
            'temporal con cualquier empresa'    => ['STAFFING', 'Servicios y Mercadeo COL'],
            'S&M ASESORES es temporal'          => ['S&M ASESORES', 'Servimercadeo COL'],
            'sin empleador'                     => [null, 'Servimercadeo COL'],
            'sin empresa'                       => ['SERVIMERCADEO', null],
        ];
    }

    #[DataProvider('empleadorEmpresaValidos')]
    public function test_empleador_empresa_validos(?string $empleador, ?string $empresa): void
    {
        $this->assertNull(EmpresaProyectoRules::validarEmpleador($empleador, $empresa));
    }

    public static function empleadorEmpresaInvalidos(): array
    {
        return [
            'Servimercadeo + Servicios y Mercadeo' => ['SERVIMERCADEO', 'Servicios y Mercadeo COL', 'Servimercadeo'],
            'S&M + Servimercadeo'                  => ['S&M SERVICIOS Y MERCADEO', 'Servimercadeo COL', 'Servicios y Mercadeo'],
            'Servimercadeo + otra empresa'         => ['SERVIMERCADEO', 'E2BPO', 'Servimercadeo'],
        ];
    }

    #[DataProvider('empleadorEmpresaInvalidos')]
    public function test_empleador_empresa_invalidos_indican_la_empresa_correcta(string $empleador, string $empresa, string $esperada): void
    {
        $msg = EmpresaProyectoRules::validarEmpleador($empleador, $empresa);

        $this->assertNotNull($msg);
        $this->assertStringContainsString("debe ser {$esperada}", $msg);
    }

    public function test_empresas_restringidas(): void
    {
        $this->assertTrue(EmpresaProyectoRules::restringida('SERVIMERCADEO COL'));
        $this->assertTrue(EmpresaProyectoRules::restringida('Servicios y Mercadeo Col'));
        $this->assertFalse(EmpresaProyectoRules::restringida('E2BPO'));
        $this->assertFalse(EmpresaProyectoRules::restringida(null));
        $this->assertFalse(EmpresaProyectoRules::restringida(''));
    }
}
