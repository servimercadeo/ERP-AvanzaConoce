<?php

use App\Http\Controllers\Api\EmpleadoController;
use App\Http\Controllers\Api\EmpresaController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\SsoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ── Público ──────────────────────────────────────────────────────────────────
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'app' => config('app.name')]);
});

Route::get('/empresas', [EmpresaController::class, 'index']);

// Recibe usuarios desde AvanzaConoce (autenticado con X-ERP-Secret)
Route::post('/users/desde-avanzaconoce', [UserController::class, 'recibirDeAvanzaconoce']);

// AvanzaConoce solicita un token SSO para redirigir al usuario al ERP
Route::post('/sso/token', [SsoController::class, 'generarToken']);

// ── Protegido (Sanctum) ───────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn(Request $r) => $r->user()->only('id', 'name', 'email', 'rol'));

    // Admin del ERP crea un usuario → se replica en AvanzaConoce
    Route::post('/users', [UserController::class, 'store']);

    // CRUD completo de empleados
    Route::apiResource('empleados', EmpleadoController::class);
});
