<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        // Puede ser el correo de AvanzaConoce: se entra con el del usuario del ERP de su cédula.
        $credentials['email'] = User::porCorreoDeAcceso($credentials['email'])?->email ?? $credentials['email'];

        // Un usuario pendiente de alta (creado desde Contratos) todavía no recibió
        // credenciales: no puede entrar hasta que Empleados complete su alta.
        if (!Auth::attempt([...$credentials, 'pendiente_alta' => false], remember: true)) {
            throw ValidationException::withMessages([
                'email' => 'Las credenciales no son correctas.',
            ]);
        }

        $request->session()->regenerate();

        return response()->json([
            // Con sus permisos: sin ellos el menú mostraría todo hasta recargar la página.
            'user' => Auth::user()->datosDeSesion(),
        ]);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Sesión cerrada.']);
    }
}
