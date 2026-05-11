<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class UserSyncService
{
    /**
     * Crea un usuario en el ERP y lo sincroniza a AvanzaConoce.
     */
    public function crearEnErpYSincronizar(array $datos): User
    {
        // 1. Crear en el ERP
        $usuario = User::create([
            'name'     => $datos['name'],
            'email'    => $datos['email'],
            'password' => Hash::make($datos['password']),
            'rol'      => $datos['rol'] ?? 'consultor',
            'activo'   => true,
        ]);

        // 2. Sincronizar a AvanzaConoce
        $this->enviarAAvanzaconoce($usuario, $datos['password']);

        return $usuario;
    }

    /**
     * Llama a la API de AvanzaConoce para crear el usuario allá.
     * AvanzaConoce guarda la misma password hash para que las
     * credenciales sean idénticas en ambos sistemas.
     */
    private function enviarAAvanzaconoce(User $usuario, string $passwordPlano): void
    {
        $url = config('sso.avanzaconoce_api_url') . '/api/erp/users';

        try {
            $respuesta = Http::withHeaders([
                'X-ERP-Secret' => config('sso.secret'),
                'Accept'       => 'application/json',
            ])->post($url, [
                'name'         => $usuario->name,
                'email'        => $usuario->email,
                'password'     => $passwordPlano, // AvanzaConoce hashea por su cuenta
                'erp_user_id'  => $usuario->id,
            ]);

            if ($respuesta->successful()) {
                $idExterno = $respuesta->json('id');
                $usuario->update(['avanzaconoce_id' => $idExterno]);
                Log::info("SSO: usuario {$usuario->email} sincronizado con AvanzaConoce (ID: {$idExterno})");
            } else {
                Log::error("SSO: error sincronizando {$usuario->email} — " . $respuesta->body());
            }
        } catch (\Exception $e) {
            // No bloquear la creación en ERP si AvanzaConoce falla
            Log::error("SSO: no se pudo conectar a AvanzaConoce — " . $e->getMessage());
        }
    }
}