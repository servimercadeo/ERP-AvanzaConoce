<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Cada persona tiene su propia cédula y su propio correo en todo el proceso (candidato →
 * formulario de ingreso → empleado): un correo no puede ser de dos cédulas distintas y una
 * cédula no puede registrarse dos veces como candidato. Así los datos de la persona se
 * encuentran siempre por su cédula y el correo real llega intacto hasta el empleado.
 */
class IdentidadUnica
{
    /**
     * Mensaje de error si el correo ya está registrado para otra cédula (candidatos,
     * formulario de nuevos ingresos o empleados), o null si está libre o es de la misma
     * persona.
     */
    public static function correoDeOtraPersona(?string $correo, ?string $cedula): ?string
    {
        $correo = trim((string) $correo);
        if ($correo === '') {
            return null;
        }
        $cedula = trim((string) $cedula);

        $otra = DB::table('candidatos')->where('correo', $correo)->where('identificacion', '!=', $cedula)->value('identificacion')
            ?? DB::table('respuestas_ingresos')->where('correo', $correo)->where('documento', '!=', $cedula)->value('documento')
            ?? DB::table('users')->where('email', $correo)->whereNotNull('cedula')->where('cedula', '!=', $cedula)->value('cedula');

        return $otra
            ? "El correo {$correo} ya está registrado para otra persona. Usa un correo diferente."
            : null;
    }

    /**
     * Mensaje de error si la cédula ya está registrada como candidato (sin contar el
     * candidato $exceptoId, para poder editarlo), o null si está libre.
     */
    public static function cedulaDeOtroCandidato(?string $cedula, ?int $exceptoId = null): ?string
    {
        $cedula = trim((string) $cedula);
        if ($cedula === '') {
            return null;
        }

        $existe = DB::table('candidatos')
            ->where('identificacion', $cedula)
            ->when($exceptoId, fn ($q) => $q->where('id', '!=', $exceptoId))
            ->exists();

        return $existe ? "Ya existe un candidato registrado con la cédula {$cedula}." : null;
    }
}
