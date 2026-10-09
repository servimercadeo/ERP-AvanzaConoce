<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Credenciales al dar de alta a un empleado: una persona tiene una sola contraseña en
 * AvanzaConoce y en el ERP. Si ya existe en AvanzaConoce (tabla `users` de la misma base,
 * `nit` = cédula), el ERP usa su misma contraseña (ya cifrada con bcrypt, igual que aquí);
 * si no existe, se genera una temporal. AvanzaConoce, a su vez, copia a `erp_users` cada
 * cambio de contraseña que se haga allá.
 */
class CredencialesAvanzaConoce
{
    /** Texto que se muestra como contraseña cuando se usa la de AvanzaConoce. */
    public const MISMA_DE_AVANZA = 'La misma de AvanzaConoce';

    /**
     * @return array{hash: string, mostrar: string, de_avanza: bool}
     *   hash: lo que se guarda en erp_users.password; mostrar: lo que ve quien da el alta.
     */
    public static function paraAlta(?string $cedula): array
    {
        if ($hash = self::passwordEnAvanza($cedula)) {
            return ['hash' => $hash, 'mostrar' => self::MISMA_DE_AVANZA, 'de_avanza' => true];
        }

        // Contraseña temporal de 10 caracteres: 2 mayúsculas + 5 minúsculas + 3 dígitos
        $plano = strtoupper(Str::random(2)) . strtolower(Str::random(5)) . rand(100, 999);

        return ['hash' => Hash::make($plano), 'mostrar' => $plano, 'de_avanza' => false];
    }

    /** Contraseña cifrada del usuario de AvanzaConoce con esa cédula, o null. */
    public static function passwordEnAvanza(?string $cedula): ?string
    {
        $hash = self::columnaEnAvanza($cedula, 'password');

        // Solo bcrypt, el formato que valida el ERP.
        return is_string($hash) && str_starts_with($hash, '$2y$') ? $hash : null;
    }

    /** id del usuario de AvanzaConoce con esa cédula, o null. */
    public static function idEnAvanza(?string $cedula): ?int
    {
        $id = self::columnaEnAvanza($cedula, 'id');
        return is_numeric($id) ? (int) $id : null;
    }

    private static function columnaEnAvanza(?string $cedula, string $columna): mixed
    {
        $cedula = trim((string) $cedula);
        if (!self::disponible() || !ctype_digit($cedula)) {
            return null;
        }

        try {
            // DB::raw: la tabla de AvanzaConoce no lleva el prefijo `erp_` del ERP.
            $tabla = str_replace('`', '', (string) config('sso.avanzaconoce_users_table', 'users'));
            return DB::table(DB::raw("`{$tabla}`"))->where('nit', $cedula)->value($columna);
        } catch (\Throwable $e) {
            Log::warning("No se pudo leer {$columna} de AvanzaConoce para la cédula {$cedula}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Solo en producción, donde las tablas del ERP llevan prefijo (`erp_users`) y `users` es
     * la de AvanzaConoce. En local `users` es la propia tabla del ERP: no se consulta.
     */
    private static function disponible(): bool
    {
        return app()->environment('production') && DB::getTablePrefix() !== '';
    }
}
