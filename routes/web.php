<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\SsoController;
use Illuminate\Support\Facades\Route;

// ── Autenticación (sesión/cookies para SPA) ────────────────────────────────────
Route::post('/login',  [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');

// ── SSO: AvanzaConoce redirige aquí con el token ──────────────────────────────
Route::get('/sso/login', [SsoController::class, 'login']);

// ── SPA: React maneja todas las demás rutas ────────────────────────────────────
// Solo excluimos /sso/* porque tiene lógica de servidor.
// /login y /logout GET los maneja React (son rutas del frontend).
Route::get('/{any?}', fn() => view('app'))->where('any', '^(?!sso).*$');
