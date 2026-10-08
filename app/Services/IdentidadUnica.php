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
    public static function correoDeOtraPersona(?string $correo, ?string $cedula, ?int $exceptoUserId = null): ?string
    {
        $correo = self::normalizarCorreo($correo);
        if ($correo === '') {
            return null;
        }
        $cedula = trim((string) $cedula);
        // Sin distinguir mayúsculas ni espacios alrededor.
        $mismo = fn (string $columna) => fn ($q) => $q->whereRaw("LOWER(TRIM({$columna})) = ?", [$correo]);

        $otra = DB::table('candidatos')->where($mismo('correo'))->where('identificacion', '!=', $cedula)->exists()
            || DB::table('respuestas_ingresos')->where($mismo('correo'))->where('documento', '!=', $cedula)->exists()
            // Un usuario sin cédula (ej. un admin) también es otra persona.
            || DB::table('users')->where($mismo('email'))
                ->when($exceptoUserId, fn ($q) => $q->where('id', '!=', $exceptoUserId))
                ->where(fn ($q) => $q->whereNull('cedula')->orWhere('cedula', '')->orWhere('cedula', '!=', $cedula))
                ->exists();

        return $otra
            ? "El correo {$correo} ya está registrado para otra persona. Usa un correo diferente."
            : null;
    }

    /** Correo en minúsculas y sin espacios: así se guarda y así se compara. */
    public static function normalizarCorreo(?string $correo): string
    {
        return mb_strtolower(trim((string) $correo), 'UTF-8');
    }

    /**
     * Mensaje de error si el celular ya está registrado para otra cédula (candidatos,
     * formulario de nuevos ingresos o empleados), o null si está libre o es de la misma
     * persona. Se comparan solo los dígitos y los últimos 10, así "+57 321 708 5555" y
     * "3217085555" son el mismo número. Los rellenos ("0000000000") no cuentan.
     */
    public static function telefonoDeOtraPersona(?string $telefono, ?string $cedula, ?int $exceptoUserId = null): ?string
    {
        $numero = self::normalizarTelefono($telefono);
        if (strlen($numero) < 7 || preg_match('/^(\d)\1+$/', $numero)) {
            return null;
        }
        $cedula = trim((string) $cedula);
        // Sin espacios, guiones, puntos, paréntesis ni "+" (REPLACE: sirve en cualquier versión de MySQL).
        $digitos = fn (string $columna) => array_reduce([' ', '-', '.', '(', ')', '+'],
            fn ($sql, $c) => "REPLACE({$sql}, '{$c}', '')", $columna);
        $mismo = fn (string $columna) => fn ($q) => $q->whereRaw('RIGHT(' . $digitos($columna) . ', 10) = ?', [$numero]);

        $otra = DB::table('candidatos')->where($mismo('celular'))->where('identificacion', '!=', $cedula)->exists()
            || DB::table('respuestas_ingresos')->where($mismo('celular'))->where('documento', '!=', $cedula)->exists()
            || DB::table('users')->where($mismo('movil'))
                ->when($exceptoUserId, fn ($q) => $q->where('id', '!=', $exceptoUserId))
                ->where(fn ($q) => $q->whereNull('cedula')->orWhere('cedula', '')->orWhere('cedula', '!=', $cedula))
                ->exists();

        return $otra
            ? "El número {$telefono} ya está registrado para otra persona. Usa un número diferente."
            : null;
    }

    /** Solo los dígitos y, si trae indicativo, los últimos 10. */
    public static function normalizarTelefono(?string $telefono): string
    {
        return substr(preg_replace('/\D/', '', (string) $telefono), -10);
    }

    /**
     * Mensaje de error si la cédula es de un empleado activo (al registrar un candidato
     * nuevo). Los inactivos o retirados sí pueden volver a postularse (reingreso).
     */
    public static function cedulaDeEmpleadoActivo(?string $cedula): ?string
    {
        $cedula = trim((string) $cedula);
        if ($cedula === '') {
            return null;
        }

        $activo = DB::table('users')->where('cedula', $cedula)
            ->where('activo', true)->where('estado_empleado', 'Activo')
            ->exists();

        return $activo ? "La cédula {$cedula} ya pertenece a un empleado activo." : null;
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
