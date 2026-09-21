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
            'SYM + ADMINISTRACION'   => ['SERVICIOS Y MERCADEO COL', 'ADMINISTRACION'],
            'Servimercadeo + DIRECTV' => ['SERVIMERCADEO COL', 'DIRECTV CO'],
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
            'SYM + DIRECTV'          => ['SERVICIOS Y MERCADEO COL', 'DIRECTV CO'],
            'Servimercadeo + TIGO'   => ['SERVIMERCADEO COL', 'TIGO HOME'],
            'Servimercadeo + otro'   => ['SERVIMERCADEO COL', 'HUGHES COL'],
        ];
    }

    #[DataProvider('combinacionesInvalidas')]
    public function test_combinaciones_invalidas_devuelven_mensaje_con_los_permitidos(string $empresa, string $proyecto): void
    {
        $msg = EmpresaProyectoRules::validar($empresa, $proyecto);

        $this->assertNotNull($msg);
        $this->assertStringContainsString($proyecto, $msg);
        $this->assertStringContainsString('Proyectos permitidos', $msg);
    }

    public function test_proyectos_permitidos(): void
    {
        $this->assertSame(['DIRECTV CO'], EmpresaProyectoRules::proyectosPermitidos('SERVIMERCADEO COL'));
        $this->assertSame(['TIGO EXPRESS', 'TIGO HOME', 'ADMINISTRACION'], EmpresaProyectoRules::proyectosPermitidos('Servicios y Mercadeo Col'));
        $this->assertNull(EmpresaProyectoRules::proyectosPermitidos('E2BPO'));
        $this->assertNull(EmpresaProyectoRules::proyectosPermitidos(null));
        $this->assertNull(EmpresaProyectoRules::proyectosPermitidos(''));
    }
}
