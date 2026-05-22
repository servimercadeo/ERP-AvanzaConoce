<?php

use App\Http\Controllers\Api\AppSettingController;
use App\Http\Controllers\Api\ContratoController;
use App\Http\Controllers\Api\EmpleadoController;
use App\Http\Controllers\Api\EmpresaController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\UserPreferenceController;
use App\Http\Controllers\SsoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// ── Público ──────────────────────────────────────────────────────────────────
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'app' => config('app.name')]);
});

// Configuración global (tema de color) — lectura pública
Route::get('/settings', [AppSettingController::class, 'index']);

Route::get('/empresas', [EmpresaController::class, 'index']);

Route::get('/catalogos', function () {
    $sedesPorCiudad = DB::table('sedes')
        ->join('ciudades', 'sedes.id_ciudad', '=', 'ciudades.id')
        ->select('ciudades.nombre as ciudad', 'sedes.nombre as sede')
        ->orderBy('ciudades.nombre')
        ->get()
        ->groupBy('ciudad')
        ->map(fn($g) => $g->pluck('sede')->values()->toArray())
        ->toArray();

    $ciudades = array_keys($sedesPorCiudad);

    return response()->json([
        'cargos'            => DB::table('cargos')->select('nombre')->distinct()->orderBy('nombre')->pluck('nombre'),
        'eps'               => DB::table('eps')->select('nombre')->distinct()->orderBy('nombre')->pluck('nombre'),
        'arls'              => DB::table('arls')->select('nombre')->distinct()->orderBy('nombre')->pluck('nombre'),
        'cajas'             => DB::table('cajas_compensacion')->select('nombre')->distinct()->orderBy('nombre')->pluck('nombre'),
        'bancos'            => DB::table('bancos')->select('nombre')->distinct()->orderBy('nombre')->pluck('nombre'),
        'tipos_rh'          => DB::table('tipos_rh')->select('nombre')->distinct()->orderBy('nombre')->pluck('nombre'),
        'sedes'             => DB::table('sedes')->select('nombre')->distinct()->orderBy('nombre')->pluck('nombre'),
        'ciudades'          => $ciudades,
        'sedes_por_ciudad'  => $sedesPorCiudad,
        'tipos_funcionario' => DB::table('users')->whereNotNull('tipo_funcionario')->where('tipo_funcionario', '!=', '')->select('tipo_funcionario')->distinct()->orderBy('tipo_funcionario')->pluck('tipo_funcionario'),
        'tipos_vinculacion' => DB::table('users')->whereNotNull('tipo_vinculacion')->where('tipo_vinculacion', '!=', '')->select('tipo_vinculacion')->distinct()->orderBy('tipo_vinculacion')->pluck('tipo_vinculacion'),
    ]);
});

// Verifica si existe un usuario con el correo dado (para flujo de login en dos pasos)
Route::post('/check-email', function (Request $request) {
    $request->validate(['email' => 'required|email']);
    $user = \App\Models\User::where('email', $request->email)->first();
    if (!$user) {
        return response()->json(['exists' => false], 200);
    }
    return response()->json(['exists' => true, 'name' => $user->name], 200);
});

// Recibe usuarios desde AvanzaConoce (autenticado con X-ERP-Secret)
Route::post('/users/desde-avanzaconoce', [UserController::class, 'recibirDeAvanzaconoce']);

// AvanzaConoce solicita un token SSO para redirigir al usuario al ERP
Route::post('/sso/token', [SsoController::class, 'generarToken']);

// ── Protegido (Sanctum) ───────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    // Actualizar configuración global (tema de color)
    Route::post('/settings', [AppSettingController::class, 'update']);

    // Preferencias personales de apariencia por usuario
    Route::get('/user/preferences',  [UserPreferenceController::class, 'show']);
    Route::post('/user/preferences', [UserPreferenceController::class, 'update']);
    Route::get('/user', fn(Request $r) => $r->user()->only('id', 'name', 'email', 'rol'));

    // Admin del ERP crea un usuario → se replica en AvanzaConoce
    Route::post('/users', [UserController::class, 'store']);

    // CRUD completo de empleados
    Route::apiResource('empleados', EmpleadoController::class);

    // CRUD completo de contratos
    Route::apiResource('contratos', ContratoController::class);

    // Opciones y CRUD de sedes
    Route::get('sedes/options', [App\Http\Controllers\Api\SedeController::class, 'options']);
    Route::apiResource('sedes', App\Http\Controllers\Api\SedeController::class);
});
