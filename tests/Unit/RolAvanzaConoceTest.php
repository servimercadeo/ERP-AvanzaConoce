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
            'Financiera'                         => ['financiera', 'CONTADOR', 'DIRECTV', 'admin'],
            'DirecTV asesor comercial'           => ['general', 'ASESOR COMERCIAL', 'DIRECTV', 'asesor_directo'],
            'DirecTV asesor comercial variante'  => ['general', 'asesor comercial sala de ventas', 'directv', 'asesor_directo'],
            'DirecTV supervisor'                 => ['supervisores', 'SUPERVISOR COMERCIAL', 'DIRECTV', 'supervisor'],
            'DirecTV otro cargo'                 => ['general', 'BACKOFFICE', 'DIRECTV', 'empleado'],
            'DirecTV con nombre anterior (prod)' => ['general', 'ASESOR COMERCIAL', 'DIRECTV COL', 'asesor_directo'],
            'DirecTV con nombre anterior (local)' => ['supervisores', 'SUPERVISOR COMERCIAL', 'DIRECTV CO', 'supervisor'],
            'Tigo Express asesor'                => ['general', 'ASESOR COMERCIAL', 'TIGO EXPRESS', 'asesor'],
            'Tigo Home supervisora'              => ['supervisores', 'SUPERVISORA DE ZONA', 'TIGO HOME', 'supervisor'],
            'Tigo otro cargo: sin regla'         => ['general', 'BACKOFFICE', 'TIGO EXPRESS', null],
            'Operaciones: pendiente'             => ['operaciones', 'ASESOR COMERCIAL', 'DIRECTV', null],
            'Admin del ERP: pendiente'           => ['admin', 'GERENTE', 'DIRECTV', null],
            'Administrativo backoffice'          => ['general', 'BACKOFFICE', 'ADMINISTRATIVO', 'admin'],
            'Administrativo supervisor'          => ['supervisores', 'SUPERVISOR DE CALIDAD', 'administrativo', 'admin'],
            'Operaciones en administrativo: pendiente' => ['operaciones', 'ANALISTA', 'ADMINISTRATIVO', null],
            'Otro proyecto: sin regla'           => ['general', 'ASESOR COMERCIAL', 'HUGHES COL', null],
            'Sin contrato ni rol admin'          => ['general', 'ASESOR COMERCIAL', null, null],
            'Técnico en DirecTV'                 => ['tecnico', 'TÉCNICO DE INSTALACIONES', 'DIRECTV', 'empleado'],
            'Técnico en Tigo'                    => ['tecnico', 'TECNICO DE INSTALACIONES', 'TIGO HOME', 'empleado'],
            'Técnico en Administrativo'          => ['tecnico', 'TECNICO', 'ADMINISTRATIVO', 'empleado'],
            'Técnico sin contrato'               => ['tecnico', 'TECNICO', null, 'empleado'],
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
