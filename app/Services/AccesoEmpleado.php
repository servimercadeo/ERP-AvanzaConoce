<?php

namespace App\Services;

use App\Models\Contrato;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * El "Estado Empleado" controla el acceso de la persona al ERP y a AvanzaConoce:
 * - Inactivo: `activo = false` (no entra al ERP, ni con contraseña ni por SSO) y en
 *   AvanzaConoce `estado = 'Inactivo'` (lo mismo que su botón "Bloquear").
 * - Activo: lo contrario.
 *
 * Al finalizar un contrato (Finalizado o Finalizado traslado) la persona queda Inactiva, salvo
 * que tenga otro contrato vigente. Volver a darle acceso es explícito: Estado Empleado =
 * Activo en Empleados (un contrato que vuelve a Vigente no reactiva solo).
 *
 * AvanzaConoce se actualiza por su API (POST /api/erp/empleados/estado), nunca escribiendo
 * en su tabla. Si no responde, el ERP queda bien igual y se registra en el log.
 */
class AccesoEmpleado
{
    public const ACTIVO = 'Activo';
    public const INACTIVO = 'Inactivo';

    /** Estados de empleado sin acceso. Vacaciones, Incapacitado y Suspendido siguen siendo empleados. */
    public const SIN_ACCESO = ['Inactivo', 'Retirado'];

    public const CONTRATO_FINALIZADO = ['Finalizado', 'Finalizado traslado'];
    public const CONTRATO_VIGENTE = ['Vigente', 'Traslado'];

    /** Tras guardar un contrato: si quedó finalizado y no tiene otro vigente, inactiva a la persona. */
    public function alGuardarContrato(Contrato $contrato): bool
    {
        if (!in_array($contrato->estado_contrato, self::CONTRATO_FINALIZADO, true)) {
            return false;
        }
        $empleado = $contrato->empleado()->first();
        // El admin del sistema nunca se bloquea por un contrato (se quedaría sin quien administre).
        if (!$empleado || $empleado->rol === 'admin' || self::tieneContratoVigente($empleado, $contrato->id)) {
            return false;
        }
        if (!$empleado->activo && !self::tieneAcceso($empleado->estado_empleado)) {
            return false;
        }

        $this->inactivar($empleado);
        return true;
    }

    public static function tieneContratoVigente(User $empleado, ?int $exceptoContratoId = null): bool
    {
        return $empleado->contratos()
            ->when($exceptoContratoId, fn ($q) => $q->where('id', '!=', $exceptoContratoId))
            ->whereIn('estado_contrato', self::CONTRATO_VIGENTE)
            ->exists();
    }

    public static function tieneAcceso(?string $estadoEmpleado): bool
    {
        return !in_array($estadoEmpleado, self::SIN_ACCESO, true);
    }

    /**
     * Tras editar al empleado en Empleados: si cambió su Estado Empleado entre un estado con
     * acceso y uno sin acceso, se aplica en el ERP y en AvanzaConoce.
     */
    public function alCambiarEstadoEmpleado(User $empleado, ?string $estadoAnterior): void
    {
        // Igual que con los contratos: el admin del sistema nunca se bloquea solo (hay admins
        // con Estado Empleado "Inactivo" heredado de datos viejos).
        if ($empleado->rol === 'admin') {
            return;
        }
        $antes = self::tieneAcceso($estadoAnterior);
        $ahora = self::tieneAcceso($empleado->estado_empleado);
        if ($antes === $ahora && (bool) $empleado->activo === $ahora) {
            return;
        }
        if ($ahora && !$empleado->pendiente_alta) {
            $this->activar($empleado, $empleado->estado_empleado);
        } elseif (!$ahora) {
            $this->inactivar($empleado, $empleado->estado_empleado);
        }
    }

    public function inactivar(User $empleado, string $estado = self::INACTIVO): void
    {
        $empleado->forceFill(['activo' => false, 'estado_empleado' => $estado])->saveQuietly();
        $this->avanza($empleado, self::INACTIVO);
    }

    public function activar(User $empleado, string $estado = self::ACTIVO): void
    {
        $empleado->forceFill(['activo' => true, 'estado_empleado' => $estado])->saveQuietly();
        $this->avanza($empleado, self::ACTIVO);
    }

    /** Mismo estado en AvanzaConoce (por cédula). Un pendiente de alta aún no existe allá. */
    private function avanza(User $empleado, string $estado): void
    {
        $cedula = trim((string) $empleado->cedula);
        if (!AltaEnAvanzaConoce::activo() || $empleado->pendiente_alta || !ctype_digit($cedula)) {
            return;
        }

        $url = rtrim((string) config('sso.avanzaconoce_api_url'), '/') . '/api/erp/empleados/estado';
        try {
            $respuesta = Http::withHeaders(['X-ERP-Secret' => config('sso.secret')])
                ->acceptJson()
                ->timeout((int) config('sso.avanzaconoce_timeout', 10))
                ->connectTimeout(5)
                ->post($url, ['cedula' => $cedula, 'estado' => $estado]);
            if (!$respuesta->successful()) {
                Log::warning("AvanzaConoce: HTTP {$respuesta->status()} al poner {$estado} la cédula {$cedula}: " . mb_substr($respuesta->body(), 0, 300));
            }
        } catch (\Throwable $e) {
            Log::warning("AvanzaConoce: no se pudo poner {$estado} la cédula {$cedula}: {$e->getMessage()}");
        }
    }
}
