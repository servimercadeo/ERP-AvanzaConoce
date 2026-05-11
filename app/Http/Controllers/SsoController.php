<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\SsoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SsoController extends Controller
{
    public function __construct(private SsoService $sso) {}

    /**
     * AvanzaConoce redirige aquí cuando el usuario hace clic en "Ir al ERP".
     * URL: GET /sso/login?token=xxx
     */
    public function login(Request $request)
    {
        $token = $request->query('token');

        if (!$token) {
            return redirect('/')->withErrors(['sso' => 'Token SSO no proporcionado.']);
        }

        $payload = $this->sso->validarToken($token);

        if (!$payload) {
            return redirect('/')->withErrors(['sso' => 'Token SSO inválido o expirado.']);
        }

        $usuario = User::where('email', $payload->email)->where('activo', true)->first();

        if (!$usuario) {
            return redirect('/')->withErrors(['sso' => 'Usuario no encontrado en el ERP.']);
        }

        // Registrar el momento del login SSO
        $usuario->update(['ultimo_sso_at' => now()]);

        Auth::login($usuario, remember: true);

        return redirect('/dashboard');
    }

    /**
     * Genera un token SSO para que AvanzaConoce pueda redirigir al ERP.
     * Solo se usa si el ERP necesita ser quien genere el token (flujo inverso).
     * POST /api/sso/token  (protegido con X-ERP-Secret)
     */
    public function generarToken(Request $request)
    {
        $request->validate([
            'email'           => 'required|email',
            'avanzaconoce_id' => 'required|integer',
        ]);

        $secretRecibido = $request->header('X-ERP-Secret');

        if ($secretRecibido !== config('sso.secret')) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $token = $this->sso->generarToken(
            $request->email,
            $request->avanzaconoce_id
        );

        return response()->json([
            'token'      => $token,
            'expires_in' => 60,
            'redirect'   => url("/sso/login?token={$token}"),
        ]);
    }
}
