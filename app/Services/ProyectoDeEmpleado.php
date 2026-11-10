<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Proyecto de cada empleado (DIRECTV, TIGO HOME...), sacado del contrato: `users` no lo
 * guarda. Lo usan los selectores de personas de Parametros > Operativos (Supervisores,
 * Torres) y el de auxiliares de Work Orders para mostrar primero a los de DIRECTV.
 */
class ProyectoDeEmpleado
{
    public const PRINCIPAL = 'DIRECTV';

    /** user_id => nombre del proyecto. Si tiene varios contratos, DIRECTV manda. */
    public static function porUsuario(): Collection
    {
        return DB::table('contratos')
            ->whereNotNull('empleado_id')
            ->orderByDesc('fecha_ingreso')
            ->get(['empleado_id', 'cliente_proyecto'])
            ->groupBy('empleado_id')
            ->map(function (Collection $contratos) {
                $proyectos = $contratos
                    ->map(fn ($c) => EmpresaProyectoRules::nombreActual($c->cliente_proyecto))
                    ->filter()
                    ->values();

                return $proyectos->contains(self::PRINCIPAL) ? self::PRINCIPAL : $proyectos->first();
            })
            ->filter();
    }

    /** Empleados activos de DIRECTV, por nombre: lo que ofrecen todos los selectores de personas. */
    public static function personasDirectv(): Collection
    {
        $proyectos = self::porUsuario();

        return self::soloDirectv(
            User::where('activo', true)->get(['id', 'name', 'cargo', 'cedula'])
                ->map(fn (User $u) => [
                    'id'       => $u->id,
                    'nombre'   => $u->name,
                    'cargo'    => $u->cargo,
                    'cedula'   => $u->cedula,
                    'proyecto' => $proyectos->get($u->id),
                ])
        );
    }

    /**
     * Solo la gente de DIRECTV, por nombre. Los de otro proyecto y quien no tenga contrato
     * no se ofrecen: estos selectores son del día a día de DIRECTV. A quien ya esté
     * asignado no lo toca, porque eso vive en su propia tabla.
     */
    public static function soloDirectv(Collection $personas): Collection
    {
        return $personas
            ->filter(fn (array $p) => $p['proyecto'] === self::PRINCIPAL)
            ->sortBy(fn (array $p) => mb_strtolower((string) $p['nombre'], 'UTF-8'))
            ->values();
    }
}
