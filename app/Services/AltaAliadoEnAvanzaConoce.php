<?php

namespace App\Services;

use App\Models\Aliado;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Al crear un aliado EMPRESA en el ERP, crea su usuario en AvanzaConoce como lo crean a mano
 * en la pantalla de usuarios: rol "Aliado" (el `asesor` de los portales DIRECTV/HUGHES...),
 * en el portal de su proyecto, con razón social, código PDV, modalidad y su líder
 * (jefe inmediato) como supervisor. Usa el mismo endpoint que el alta de empleados
 * (POST /api/erp/empleados con rol_erp "aliado"); ver AltaEnAvanzaConoce.
 *
 * El aliado empresa no entra al ERP: la contraseña es solo de AvanzaConoce. Se genera aquí,
 * se muestra una vez y se envía su hash bcrypt (guardado en aliados.avanza_password para
 * poder reintentar). Si allá ya existe alguien con ese NIT, se conserva su contraseña.
 * Nunca hace fallar la creación del aliado: si AvanzaConoce no responde, queda 'error' y se
 * reintenta con `php artisan avanza:sincronizar-usuarios`.
 */
class AltaAliadoEnAvanzaConoce
{
    /** Clave lógica del rol en AvanzaConoce (config erp.roles allá: aliado => asesor). */
    public const ROL = 'aliado';
    /** Área de la empresa de los aliados en AvanzaConoce (catálogo area_empresa). */
    public const AREA = 'Comercial';
    /** Proyecto que define el portal si el aliado trabaja para varios. */
    private const PROYECTO_PREFERIDO = 'DIRECTV';

    /**
     * Crea el aliado recién guardado y devuelve las credenciales a mostrar, o null si la
     * integración está apagada: ['nombre', 'email', 'password', 'de_avanza', 'avanza' => [estado, mensaje]].
     */
    public function sincronizar(Aliado $aliado): ?array
    {
        if (!AltaEnAvanzaConoce::activo()) {
            return null;
        }

        $credenciales = CredencialesAvanzaConoce::paraAlta(self::nit($aliado));
        $aliado->forceFill(['avanza_password' => $credenciales['hash']])->saveQuietly();

        if ($credenciales['de_avanza']) {
            $this->guardarEstado($aliado, AltaEnAvanzaConoce::OK, null, CredencialesAvanzaConoce::idEnAvanza(self::nit($aliado)));
            $resultado = ['estado' => 'existente', 'mensaje' => 'Ya tenía usuario en AvanzaConoce con este NIT; se conserva su contraseña de allá.'];
        } else {
            $resultado = $this->enviar($aliado);
            if ($resultado['ya_existia']) {
                $credenciales = ['mostrar' => CredencialesAvanzaConoce::MISMA_DE_AVANZA, 'de_avanza' => true];
            }
        }

        return [
            'nombre'    => $aliado->nombre,
            'email'     => mb_strtolower(trim((string) $aliado->correo)),
            'password'  => $credenciales['mostrar'],
            'de_avanza' => $credenciales['de_avanza'],
            'solo_avanza' => true,
            'avanza'    => ['estado' => $resultado['estado'], 'mensaje' => $resultado['mensaje']],
        ];
    }

    /**
     * Envía el aliado a AvanzaConoce y guarda el estado. También lo usa el comando de reintento.
     *
     * @return array{estado: string, mensaje: string, ya_existia: bool}
     */
    public function enviar(Aliado $aliado): array
    {
        if ($falta = $this->datoFaltante($aliado)) {
            return $this->fallo($aliado, AltaEnAvanzaConoce::CONFLICTO, "No se puede crear en AvanzaConoce: {$falta}. Corrígelo editando el aliado.");
        }

        $url = rtrim((string) config('sso.avanzaconoce_api_url'), '/') . '/api/erp/empleados';

        try {
            $respuesta = Http::withHeaders(['X-ERP-Secret' => config('sso.secret')])
                ->acceptJson()
                ->timeout((int) config('sso.avanzaconoce_timeout', 10))
                ->connectTimeout(5)
                ->post($url, $this->payload($aliado));
        } catch (\Throwable $e) {
            Log::warning("AvanzaConoce: no se pudo crear el aliado {$aliado->documento}: {$e->getMessage()}");
            return $this->fallo($aliado, AltaEnAvanzaConoce::ERROR, 'AvanzaConoce no respondió. Se reintentará automáticamente.');
        }

        if ($respuesta->successful()) {
            $yaExistia = (bool) $respuesta->json('ya_existia', false);
            $this->guardarEstado($aliado, AltaEnAvanzaConoce::OK, null, $respuesta->json('id'));
            return [
                'estado'     => AltaEnAvanzaConoce::OK,
                'mensaje'    => $yaExistia
                    ? 'Ya tenía usuario en AvanzaConoce con este NIT; se conserva su contraseña de allá.'
                    : 'Usuario creado en AvanzaConoce como Aliado, con su líder como supervisor.',
                'ya_existia' => $yaExistia,
            ];
        }

        if (in_array($respuesta->status(), [409, 422], true)) {
            return $this->fallo($aliado, AltaEnAvanzaConoce::CONFLICTO, 'AvanzaConoce no creó el usuario: ' . $this->motivo($respuesta));
        }

        Log::warning("AvanzaConoce: HTTP {$respuesta->status()} al crear el aliado {$aliado->documento}: " . mb_substr($respuesta->body(), 0, 300));
        return $this->fallo($aliado, AltaEnAvanzaConoce::ERROR, 'AvanzaConoce respondió con un error. Se reintentará automáticamente.');
    }

    /**
     * Lo que pide la pantalla de usuarios de AvanzaConoce para un aliado. El NIT va sin guion
     * (901538103-9 => 9015381039), como los aliados creados allá. La razón social se reparte
     * en nombre y apellido (allá son obligatorios para el contacto de Bitrix).
     */
    private function payload(Aliado $aliado): array
    {
        $aliado->loadMissing(['proyectos:id,nombre', 'jefeInmediato:id,name,email']);
        $jefe = $aliado->jefeInmediato;
        [$nombre, $apellido] = self::partirRazonSocial($aliado->nombre);
        $correo = mb_strtolower(trim((string) $aliado->correo));

        return [
            'rol_avanza'        => self::ROL,
            'rol_erp'           => self::ROL,
            'proyecto'          => self::proyectoPrincipal($aliado),
            'cedula'            => self::nit($aliado),
            'password_hash'     => $aliado->avanza_password,

            'nombres'           => $nombre,
            'apellidos'         => $apellido,
            'name'              => $aliado->nombre,
            'email'             => $correo,
            'email_contacto'    => $correo,
            'movil'             => preg_replace('/[\s\-]/', '', (string) $aliado->telefono),
            'ciudad'            => $aliado->ciudad,
            'direccion'         => $aliado->direccion,
            'area_empresa'      => self::AREA,

            'razon_social'      => $aliado->nombre,
            'codigo_pvd'        => $aliado->codigo_pdv,
            'modalidad_id_bt'   => $aliado->modalidad_id_bt,

            'jefe_inmediato_nombre' => $jefe?->name,
            'jefe_inmediato_correo' => $jefe ? mb_strtolower(trim((string) $jefe->email)) : null,
        ];
    }

    /** NIT/documento solo con dígitos: es la llave (`nit`) del usuario en AvanzaConoce. */
    public static function nit(Aliado $aliado): string
    {
        return preg_replace('/\D/', '', (string) $aliado->documento);
    }

    /** Proyecto que define su portal: DIRECTV si lo tiene; si no, el primero por nombre. */
    public static function proyectoPrincipal(Aliado $aliado): ?string
    {
        $nombres = $aliado->proyectos->pluck('nombre')->map(fn ($n) => mb_strtoupper(trim($n)))->sort()->values();
        return $nombres->contains(self::PROYECTO_PREFERIDO) ? self::PROYECTO_PREFERIDO : $nombres->first();
    }

    /** "SATELITAL CARVAJAL ACEVEDO S.A.S" => ["SATELITAL CARVAJAL", "ACEVEDO S.A.S"]. */
    public static function partirRazonSocial(string $razonSocial): array
    {
        $palabras = preg_split('/\s+/', trim($razonSocial)) ?: [];
        if (count($palabras) < 2) {
            return [trim($razonSocial), trim($razonSocial)];
        }
        $mitad = (int) ceil(count($palabras) / 2);
        return [implode(' ', array_slice($palabras, 0, $mitad)), implode(' ', array_slice($palabras, $mitad))];
    }

    private function datoFaltante(Aliado $aliado): ?string
    {
        $nit = self::nit($aliado);
        if (strlen($nit) < 3 || strlen($nit) > 15) {
            return 'el documento debe tener entre 3 y 15 dígitos';
        }
        if (trim((string) $aliado->telefono) === '') {
            return 'falta el teléfono (en AvanzaConoce es obligatorio)';
        }
        if (trim((string) $aliado->correo) === '') {
            return 'falta el correo';
        }
        if (empty($aliado->avanza_password)) {
            return 'no tiene contraseña generada';
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

    private function fallo(Aliado $aliado, string $estado, string $mensaje): array
    {
        $this->guardarEstado($aliado, $estado, $mensaje);
        return ['estado' => $estado, 'mensaje' => $mensaje, 'ya_existia' => false];
    }

    private function guardarEstado(Aliado $aliado, string $estado, ?string $error, mixed $idAvanza = null): void
    {
        $aliado->forceFill([
            'avanza_sync_estado' => $estado,
            'avanza_sync_error'  => $error ? mb_substr($error, 0, 500) : null,
            'avanza_sync_at'     => now(),
        ] + (is_numeric($idAvanza) ? ['avanzaconoce_id' => (int) $idAvanza] : []))->saveQuietly();
    }
}
