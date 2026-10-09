<?php

namespace App\Services;

use App\Models\User;

/**
 * Qué rol de AvanzaConoce le corresponde a un empleado del ERP al crearlo allá.
 *
 * El ERP manda una CLAVE lógica (no el nombre interno del rol de Spatie): AvanzaConoce la
 * traduce a su rol real ("asesor_directo" es el que su pantalla muestra como "Asesor
 * Directo", etc.). Reglas acordadas con Talento Humano:
 *
 *   rol ERP tic / th / financiera            -> admin   (cualquier proyecto)
 *   DIRECTV  + cargo ASESOR COMERCIAL...     -> asesor_directo
 *   DIRECTV  + cargo de supervisor           -> supervisor
 *   DIRECTV  + cualquier otro cargo          -> empleado
 *   TIGO     + cargo ASESOR COMERCIAL...     -> asesor
 *   TIGO     + cargo de supervisor           -> supervisor
 *   cualquier otro caso (rol operaciones o admin del ERP, otros proyectos o cargos) -> null:
 *   todavía no tiene regla y NO se crea en AvanzaConoce hasta definirla.
 *
 * El proyecto sale del contrato más reciente (`cliente_proyecto`).
 */
class RolAvanzaConoce
{
    public const ADMIN = 'admin';
    public const SUPERVISOR = 'supervisor';
    public const ASESOR = 'asesor';
    public const ASESOR_DIRECTO = 'asesor_directo';
    public const EMPLEADO = 'empleado';

    /** Claves que puede recibir AvanzaConoce. */
    public const CLAVES = [self::ADMIN, self::SUPERVISOR, self::ASESOR, self::ASESOR_DIRECTO, self::EMPLEADO];

    private const ROLES_ERP_ADMIN = ['tic', 'th', 'financiera'];

    /** Proyectos del ERP (contratos.cliente_proyecto) de cada grupo de reglas. */
    public const PROYECTOS_DIRECTV = ['DIRECTV CO'];
    public const PROYECTOS_TIGO = ['TIGO EXPRESS', 'TIGO HOME'];

    public static function para(User $user, ?string $proyecto): ?string
    {
        if (in_array($user->rol, self::ROLES_ERP_ADMIN, true)) {
            return self::ADMIN;
        }
        if (in_array($user->rol, ['operaciones', 'admin'], true)) {
            return null; // pendiente de definir
        }

        $cargo = mb_strtoupper(trim((string) $user->cargo));
        $proyecto = mb_strtoupper(trim((string) $proyecto));
        $esAsesor = str_starts_with($cargo, 'ASESOR COMERCIAL');
        $esSupervisor = str_contains($cargo, 'SUPERVIS');

        if (in_array($proyecto, self::PROYECTOS_DIRECTV, true)) {
            return match (true) {
                $esAsesor     => self::ASESOR_DIRECTO,
                $esSupervisor => self::SUPERVISOR,
                default       => self::EMPLEADO,
            };
        }

        if (in_array($proyecto, self::PROYECTOS_TIGO, true)) {
            return match (true) {
                $esAsesor     => self::ASESOR,
                $esSupervisor => self::SUPERVISOR,
                default       => null,
            };
        }

        return null;
    }
}
