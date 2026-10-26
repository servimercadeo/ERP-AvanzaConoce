<?php

namespace App\Services;

use App\Models\Contrato;
use App\Models\RespuestaIngreso;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Al dar de alta a un empleado en el ERP (cuando se le entregan credenciales), crea su
 * usuario en AvanzaConoce con la MISMA contraseña.
 *
 * - Se llama a la API de AvanzaConoce (POST /api/erp/empleados), nunca se escribe directo en
 *   su tabla `users`: la creación allá dispara su propio proceso (Bitrix, notificaciones...).
 * - Se manda el hash bcrypt, no la contraseña en claro: AvanzaConoce lo guarda tal cual, así
 *   las credenciales quedan idénticas y el ERP puede reintentar sin conocer la contraseña.
 * - AvanzaConoce identifica a la persona por cédula (`nit`) y la operación es idempotente:
 *   si ya existía, no toca su contraseña y el ERP adopta la de allá.
 * - Nunca hace fallar el alta del ERP: si AvanzaConoce no responde, queda 'error' y se
 *   reintenta con `php artisan avanza:sincronizar-usuarios`.
 */
class AltaEnAvanzaConoce
{
    public const OK = 'ok';
    public const PENDIENTE = 'pendiente';
    public const ERROR = 'error';
    public const CONFLICTO = 'conflicto';
    /** Su caso (rol/cargo/proyecto) aún no tiene regla en RolAvanzaConoce: no se crea allá. */
    public const SIN_ROL = 'sin_rol';

    /**
     * Estados que el comando de reintento vuelve a intentar ('sin_rol' también: si después
     * se agrega la regla de su caso, se crea solo).
     */
    public const REINTENTABLES = [self::PENDIENTE, self::ERROR, self::SIN_ROL];

    public static function activo(): bool
    {
        return config('sso.crear_usuarios_en_avanza')
            && config('sso.avanzaconoce_api_url')
            && config('sso.secret');
    }

    /**
     * Sincroniza el alta recién hecha. Recibe las credenciales de
     * CredencialesAvanzaConoce::paraAlta() y las devuelve (con lo que se debe mostrar, que
     * cambia si resulta que ya existía en AvanzaConoce) más la clave 'avanza' con el
     * resultado para el usuario: null si la integración está apagada, o
     * ['estado' => ok|existente|error|conflicto, 'mensaje' => string].
     */
    public function sincronizar(User $user, array $credenciales): array
    {
        if (!self::activo()) {
            return $credenciales + ['avanza' => null];
        }

        // Ya tenía usuario en AvanzaConoce: el ERP tomó su contraseña de allá, nada que crear.
        if ($credenciales['de_avanza'] ?? false) {
            $this->guardarEstado($user, self::OK, null, CredencialesAvanzaConoce::idEnAvanza($user->cedula));
            return $credenciales + ['avanza' => ['estado' => 'existente', 'mensaje' => 'Ya tenía usuario en AvanzaConoce; se conserva su contraseña de allá.']];
        }

        $resultado = $this->enviar($user);

        // Se creó allá entre la consulta y el envío: enviar() ya adoptó su contraseña.
        if ($resultado['ya_existia'] && $resultado['adopto_password']) {
            $credenciales = ['hash' => $user->password, 'mostrar' => CredencialesAvanzaConoce::MISMA_DE_AVANZA, 'de_avanza' => true];
        }

        return $credenciales + ['avanza' => ['estado' => $resultado['estado'], 'mensaje' => $resultado['mensaje']]];
    }

    /**
     * Envía el usuario a AvanzaConoce y guarda el estado en el usuario del ERP. También lo
     * usa el comando de reintento.
     *
     * @return array{estado: string, mensaje: string, ya_existia: bool, adopto_password: bool}
     */
    public function enviar(User $user): array
    {
        if ($falta = $this->datoFaltante($user)) {
            return $this->fallo($user, self::CONFLICTO, "No se puede crear en AvanzaConoce: {$falta}. Corrígelo en Empleados y se reintentará solo.");
        }

        // Contrato más reciente: de ahí salen proyecto, fecha de ingreso, empleador y regional.
        $contrato = $user->contratos()->with('regional')->orderByDesc('fecha_ingreso')->orderByDesc('id')->first();
        $rol = RolAvanzaConoce::para($user, $contrato?->cliente_proyecto);
        if ($rol === null) {
            return $this->fallo($user, self::SIN_ROL, sprintf(
                'Todavía no hay regla de rol en AvanzaConoce para este caso (rol ERP: %s, cargo: %s, proyecto: %s). Se creará cuando se defina.',
                $user->rol ?: '—', $user->cargo ?: '—', $contrato?->cliente_proyecto ?: '—',
            ));
        }

        $url = rtrim((string) config('sso.avanzaconoce_api_url'), '/') . '/api/erp/empleados';

        try {
            $respuesta = Http::withHeaders(['X-ERP-Secret' => config('sso.secret')])
                ->acceptJson()
                ->timeout((int) config('sso.avanzaconoce_timeout', 10))
                ->connectTimeout(5)
                ->post($url, $this->payload($user, $contrato, $rol));
        } catch (\Throwable $e) {
            Log::warning("AvanzaConoce: no se pudo crear el usuario de la cédula {$user->cedula}: {$e->getMessage()}");
            return $this->fallo($user, self::ERROR, 'AvanzaConoce no respondió. Se reintentará automáticamente.');
        }

        if ($respuesta->successful()) {
            $yaExistia = (bool) $respuesta->json('ya_existia', false);
            // Ya existía allá (p. ej. lo crearon a mano mientras el alta estaba en reintento):
            // el ERP se queda con la contraseña de AvanzaConoce para que sigan siendo iguales.
            $adopto = false;
            if ($yaExistia && ($hash = CredencialesAvanzaConoce::passwordEnAvanza($user->cedula))) {
                $user->forceFill(['password' => $hash])->saveQuietly();
                $adopto = true;
            }
            $this->guardarEstado($user, self::OK, null, $respuesta->json('id'));
            return [
                'estado'          => self::OK,
                'mensaje'         => $yaExistia
                    ? 'Ya tenía usuario en AvanzaConoce; se conserva su contraseña de allá.'
                    : 'Usuario creado también en AvanzaConoce con la misma contraseña.',
                'ya_existia'      => $yaExistia,
                'adopto_password' => $adopto,
            ];
        }

        // 409/422: AvanzaConoce rechaza un dato (correo de otra persona, cédula inválida...).
        // Reintentar no sirve hasta que alguien lo corrija en el ERP.
        if (in_array($respuesta->status(), [409, 422], true)) {
            return $this->fallo($user, self::CONFLICTO, 'AvanzaConoce no creó el usuario: ' . $this->motivo($respuesta));
        }

        Log::warning("AvanzaConoce: HTTP {$respuesta->status()} al crear la cédula {$user->cedula}: " . mb_substr($respuesta->body(), 0, 300));
        return $this->fallo($user, self::ERROR, 'AvanzaConoce respondió con un error. Se reintentará automáticamente.');
    }

    /**
     * Todo lo que el ERP sabe del empleado y que también pide el formulario de usuarios de
     * AvanzaConoce (Users/Form.vue). Los catálogos van por NOMBRE (EPS, ARL, banco, RH,
     * estado civil, cargo, sede, ciudad...): AvanzaConoce los traduce a sus ids y deja null
     * lo que no reconozca. El supervisor va por correo (jefe inmediato del contrato).
     */
    private function payload(User $user, ?Contrato $contrato, string $rol): array
    {
        $user->loadMissing(['empresa', 'sedeCatalogo.ciudad']);
        $contrato?->loadMissing('centrosCostos');
        $fecha = fn ($valor) => $valor ? Carbon::parse($valor)->toDateString() : null;
        // El dato del contrato manda (es el vigente); si no hay, el del empleado.
        $deContrato = fn (string $campo) => $contrato?->{$campo} ?: $user->{$campo};

        return [
            // Rol y llave
            'rol_avanza'        => $rol,
            'rol_erp'           => $user->rol,
            'proyecto'          => $contrato?->cliente_proyecto,
            'erp_user_id'       => $user->id,
            'cedula'            => trim((string) $user->cedula),
            'password_hash'     => $user->getAuthPassword(),

            // Identidad y contacto
            'nombres'           => $user->nombres,
            'apellidos'         => $user->apellidos,
            'name'              => $user->name,
            'email'             => mb_strtolower(trim((string) $user->email)),
            'email_contacto'    => $user->resolverEmailReal(),
            'movil'             => trim((string) $user->movil),

            // Datos personales
            'fecha_nacimiento'  => $fecha($user->fecha_nacimiento),
            'lugar_nacimiento'  => $user->lugar_nacimiento,
            'genero'            => $user->genero,
            'raza'              => $user->raza,
            'estado_civil'      => $user->estado_civil,
            'nivel_escolaridad' => $user->nivel_escolaridad,
            'profesion'         => $user->profesion,
            'numero_hijos'      => $user->numero_hijos,
            'rh'                => $user->rh,
            'direccion'         => $user->direccion_residencia,
            'barrio'            => $user->barrio,
            'estrato'           => $user->estrato,
            // Ciudad de la sede donde trabaja; si no tiene sede, la del formulario de ingreso.
            'ciudad'            => $user->sedeCatalogo?->ciudad?->nombre
                ?: RespuestaIngreso::where('documento', $user->cedula)->latest()->value('ciudad'),
            'observaciones_medicas' => $user->observaciones_medicas,
            'alergias'          => $user->alergias,

            // Contacto de emergencia
            'contacto_emergencia_nombre'     => $user->contacto_emergencia_nombre,
            'contacto_emergencia_telefono'   => $user->contacto_emergencia_telefono,
            'contacto_emergencia_parentesco' => $user->contacto_emergencia_parentesco,

            // Laboral (contrato vigente)
            'cargo'             => $deContrato('cargo'),
            'sede'              => $deContrato('sede'),
            'regional'          => $contrato?->regional?->nombre,
            'area_empresa'      => $contrato?->area_empresa,
            'empresa'           => $contrato?->empresa ?: $user->empresa?->nombre,
            'empleador'         => $deContrato('empleador'),
            'tipo_vinculacion'  => $deContrato('tipo_vinculacion'),
            'tipo_contrato'     => $contrato?->tipo_contrato,
            'fecha_ingreso'     => $fecha($contrato?->fecha_ingreso),
            'ingresos'          => $contrato?->salario ?? $user->ingresos,
            'centro_costos'     => $contrato?->centrosCostos->first()?->codigo,
            'jefe_inmediato_nombre' => $deContrato('jefe_inmediato_nombre') ?: $deContrato('jefe_inmediato'),
            'jefe_inmediato_correo' => $deContrato('jefe_inmediato_correo'),
            'codigo_directv'    => $user->codigo_directv,

            // Seguridad social
            'eps'               => $contrato?->lps_afiliado ?: $user->eps,
            'arl'               => $deContrato('arl'),
            'fondo_pensiones'   => $deContrato('fondo_pensiones'),
            'caja_compensacion' => $deContrato('caja_compensacion'),

            // Banco
            'banco'             => $deContrato('banco'),
            'tipo_cuenta'       => $deContrato('tipo_cuenta'),
            'cuenta_bancaria'   => $deContrato('cuenta_bancaria'),

            // Licencias y certificaciones
            'licencia_carro'       => $user->licencia_carro,
            'licencia_carro_vence' => $fecha($user->licencia_carro_vence),
            'licencia_moto'        => $user->licencia_moto,
            'licencia_moto_vence'  => $fecha($user->licencia_moto_vence),
            'tiene_cert_alturas'   => (bool) $user->tiene_cert_alturas,
            'cert_alturas_vence'   => $fecha($user->cert_alturas_vence),
        ];
    }

    /**
     * Restricciones de la tabla `users` de AvanzaConoce que el ERP puede comprobar antes de
     * enviar: `nit` numérico, `phone` obligatorio (y único allá) y `email` obligatorio.
     */
    private function datoFaltante(User $user): ?string
    {
        if (!ctype_digit(trim((string) $user->cedula))) {
            return 'la cédula debe ser solo números';
        }
        if (trim((string) $user->movil) === '') {
            return 'falta el celular (en AvanzaConoce es obligatorio)';
        }
        if (trim((string) $user->email) === '') {
            return 'falta el correo';
        }
        return null;
    }

    private function motivo(Response $respuesta): string
    {
        $errores = $respuesta->json('errors');
        if (is_array($errores) && $errores) {
            return collect($errores)->flatten()->implode(' ');
        }
        return (string) ($respuesta->json('message') ?: "HTTP {$respuesta->status()}");
    }

    private function fallo(User $user, string $estado, string $mensaje): array
    {
        $this->guardarEstado($user, $estado, $mensaje);
        return ['estado' => $estado, 'mensaje' => $mensaje, 'ya_existia' => false, 'adopto_password' => false];
    }

    private function guardarEstado(User $user, string $estado, ?string $error, mixed $idAvanza = null): void
    {
        $cambios = [
            'avanza_sync_estado' => $estado,
            'avanza_sync_error'  => $error ? mb_substr($error, 0, 500) : null,
            'avanza_sync_at'     => now(),
        ];
        // avanzaconoce_id es único: solo se enlaza si ningún otro usuario del ERP lo tiene.
        if (is_numeric($idAvanza)
            && !User::where('avanzaconoce_id', (int) $idAvanza)->where('id', '!=', $user->id)->exists()) {
            $cambios['avanzaconoce_id'] = (int) $idAvanza;
        }
        $user->forceFill($cambios)->saveQuietly();
    }
}
