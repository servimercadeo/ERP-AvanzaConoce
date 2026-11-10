<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Proyecto de cada empleado (DIRECTV, TIGO HOME...), sacado del contrato: `users` no lo
 * guarda. Lo usan los selectores de personas de Parametros > Operativos (Supervisores,
 * Torres) y el de auxiliares de Work Orders para ofrecer solo a los de DIRECTV.
 */
class ProyectoDeEmpleado
{
    public const PRINCIPAL = 'DIRECTV';

    /** Estados en que el contrato está corriendo (los mismos que ContratoController). */
    private const ESTADOS_ACTIVOS = ['Vigente', 'Activo', 'Traslado'];

    /**
     * user_id => proyecto de su contrato actual: el activo más reciente; si no tiene ninguno
     * activo, el último que tuvo. Un contrato viejo de otro proyecto no cuenta (p. ej. quien
     * pasó de DIRECTV a TIGO por reingreso ya es de TIGO).
     */
    public static function porUsuario(): Collection
    {
        return DB::table('contratos')
            ->whereNotNull('empleado_id')
            ->orderByDesc('fecha_ingreso')
            ->orderByDesc('id')
            ->get(['empleado_id', 'cliente_proyecto', 'estado_contrato'])
            ->groupBy('empleado_id')
            ->map(function (Collection $contratos) {
                $actual = $contratos->first(fn ($c) => in_array($c->estado_contrato, self::ESTADOS_ACTIVOS, true))
                    ?? $contratos->first();

                return EmpresaProyectoRules::nombreActual($actual->cliente_proyecto);
            })
            ->filter();
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
