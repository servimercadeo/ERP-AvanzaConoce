<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\RolAvanzaConoce;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class RolAvanzaConoceTest extends TestCase
{
    public static function casos(): array
    {
        return [
            'TIC en cualquier proyecto'          => ['tic', 'ANALISTA', 'TIGO HOME', 'admin'],
            'TH sin contrato'                    => ['th', 'ANALISTA DE NOMINA', null, 'admin'],
            'Financiera'                         => ['financiera', 'CONTADOR', 'DIRECTV CO', 'admin'],
            'DirecTV asesor comercial'           => ['general', 'ASESOR COMERCIAL', 'DIRECTV CO', 'asesor_directo'],
            'DirecTV asesor comercial variante'  => ['general', 'asesor comercial sala de ventas', 'directv co', 'asesor_directo'],
            'DirecTV supervisor'                 => ['supervisores', 'SUPERVISOR COMERCIAL', 'DIRECTV CO', 'supervisor'],
            'DirecTV otro cargo'                 => ['general', 'BACKOFFICE', 'DIRECTV CO', 'empleado'],
            'Tigo Express asesor'                => ['general', 'ASESOR COMERCIAL', 'TIGO EXPRESS', 'asesor'],
            'Tigo Home supervisora'              => ['supervisores', 'SUPERVISORA DE ZONA', 'TIGO HOME', 'supervisor'],
            'Tigo otro cargo: sin regla'         => ['general', 'BACKOFFICE', 'TIGO EXPRESS', null],
            'Operaciones: pendiente'             => ['operaciones', 'ASESOR COMERCIAL', 'DIRECTV CO', null],
            'Admin del ERP: pendiente'           => ['admin', 'GERENTE', 'DIRECTV CO', null],
            'Otro proyecto: sin regla'           => ['general', 'ASESOR COMERCIAL', 'HUGHES COL', null],
            'Sin contrato ni rol admin'          => ['general', 'ASESOR COMERCIAL', null, null],
        ];
    }

    #[DataProvider('casos')]
    public function test_rol_que_se_envia_a_avanza(string $rolErp, string $cargo, ?string $proyecto, ?string $esperado): void
    {
        $user = new User();
        $user->rol = $rolErp;
        $user->cargo = $cargo;

        $this->assertSame($esperado, RolAvanzaConoce::para($user, $proyecto));
    }
}
