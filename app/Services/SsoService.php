<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use Illuminate\Support\Facades\Log;

class SsoService
{
    private string $secret;
    private string $algorithm = 'HS256';
    private int $ttl = 60; // segundos que vive el token SSO

    public function __construct()
    {
        $this->secret = config('sso.secret');
    }

    /**
     * Genera un token JWT para que AvanzaConoce envíe al ERP.
     * AvanzaConoce llama esto cuando el usuario hace clic en "Ir al ERP".
     */
    public function generarToken(string $email, int $avanzaconoceId): string
    {
        $ahora = time();

        $payload = [
            'iss'                => config('app.url'),
            'iat'                => $ahora,
            'exp'                => $ahora + $this->ttl,
            'email'              => $email,
            'avanzaconoce_id'    => $avanzaconoceId,
        ];

        return JWT::encode($payload, $this->secret, $this->algorithm);
    }

    /**
     * Valida el token JWT que llega desde AvanzaConoce.
     * Retorna el payload si es válido, null si no.
     */
    public function validarToken(string $token): ?object
    {
        try {
            return JWT::decode($token, new Key($this->secret, $this->algorithm));
        } catch (ExpiredException $e) {
            Log::warning('SSO: token expirado');
            return null;
        } catch (SignatureInvalidException $e) {
            Log::warning('SSO: firma inválida');
            return null;
        } catch (\Exception $e) {
            Log::warning('SSO: token inválido — ' . $e->getMessage());
            return null;
        }
    }
}