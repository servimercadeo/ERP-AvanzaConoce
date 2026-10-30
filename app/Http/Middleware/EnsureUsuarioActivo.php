<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Un usuario que quedó inactivo (Estado Empleado Inactivo/Retirado, contrato finalizado,
 * técnico desactivado) mientras tenía la sesión abierta: se cierra en su siguiente petición.
 * El login ya no lo deja entrar (AuthController / SsoController).
 */
class EnsureUsuarioActivo
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user && !$user->activo) {
            Auth::guard('web')->logout();
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }
            return response()->json(['message' => 'Tu usuario está inactivo.'], 401);
        }

        return $next($request);
    }
}
