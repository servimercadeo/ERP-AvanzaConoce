<?php

namespace App\Http\Controllers;

use App\Services\RecaptchaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $rules = [
            'email'    => 'required|email',
            'password' => 'required|string',
        ];

        if (app()->environment('production')) {
            $rules['recaptcha_token'] = 'required|string';
        }

        $request->validate($rules);

        if (app()->environment('production') && !RecaptchaService::verify($request->recaptcha_token)) {
            return response()->json(['message' => 'Verificación reCAPTCHA fallida. Inténtalo de nuevo.'], 422);
        }

        $credentials = $request->only('email', 'password');

        if (!Auth::attempt($credentials, remember: true)) {
            throw ValidationException::withMessages([
                'email' => 'Las credenciales no son correctas.',
            ]);
        }

        $request->session()->regenerate();

        return response()->json([
            'user' => Auth::user()->only('id', 'name', 'email', 'rol'),
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
