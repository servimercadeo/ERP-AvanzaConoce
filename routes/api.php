<?php

use App\Http\Controllers\Api\AppSettingController;
use App\Http\Controllers\Api\BaseIngresoController;
use App\Mail\AlertaIngresoMail;
use App\Models\BaseIngreso;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;
use App\Http\Controllers\Api\CandidatoController;
use App\Http\Controllers\Api\CandidatoDocumentoController;
use App\Http\Controllers\Api\ContratoController;
use App\Http\Controllers\Api\EmpleadoController;
use App\Http\Controllers\Api\EmpresaController;
use App\Http\Controllers\Api\RequisicionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\UserPreferenceController;
use App\Http\Controllers\SsoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

// ── Público ──────────────────────────────────────────────────────────────────
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'app' => config('app.name')]);
});

// Catálogos para el formulario público de registro de candidatos
Route::get('/registro/catalogos', function (Request $request) {
    $negocio = null;
    $estado  = null;

    if ($request->get('token')) {
        $req = DB::table('requisiciones')
            ->leftJoin('proyectos', 'requisiciones.proyecto_id', '=', 'proyectos.id')
            ->where('requisiciones.registro_token', $request->get('token'))
            ->select('proyectos.nombre as proyecto_nombre', 'requisiciones.estado')
            ->first();
        if ($req) {
            $negocio = $req->proyecto_nombre;
            $estado  = $req->estado;
        }
    }

    return response()->json([
        'ciudades'  => DB::table('ciudades')->select('id', 'nombre')->orderBy('nombre')->get(),
        'proyectos' => DB::table('proyectos')->where('activo', true)->orderBy('nombre')->pluck('nombre'),
        'negocio'   => $negocio,
        'estado'    => $estado,
    ]);
});

// Registro público de candidatos desde el formulario externo
Route::post('/candidatos/registro', function (Request $request) {
    $data = $request->validate([
        'documento'        => 'required|string|max:30',
        'nombres'          => 'required|string|max:120',
        'apellidos'        => 'required|string|max:120',
        'edad'             => 'required|integer|min:14|max:80',
        'fecha_expedicion' => 'required|date',
        'ciudad_id'        => 'required|exists:ciudades,id',
        'celular'          => 'required|string|max:15',
        'correo'           => 'required|email|max:160',
        'negocio'          => 'nullable|string|max:120',
        'token'            => 'nullable|string|max:40',
    ]);

    $requisicionId = null;
    if (!empty($data['token'])) {
        $req = DB::table('requisiciones')
            ->where('registro_token', $data['token'])
            ->select('id', 'estado')
            ->first();
        if ($req) {
            if (in_array($req->estado, ['Completada', 'Cancelada'])) {
                return response()->json(['message' => 'Esta requisición ya no está disponible.'], 409);
            }
            $requisicionId = $req->id;
        }
    }

    $candidato = DB::table('candidatos')->insertGetId([
        'requisicion_id'   => $requisicionId,
        'nombres'          => strtoupper(trim($data['nombres'] . ' ' . $data['apellidos'])),
        'tipo_documento'   => 'Cédula de Ciudadanía',
        'identificacion'   => $data['documento'],
        'fecha_expedicion' => $data['fecha_expedicion'],
        'edad'             => $data['edad'],
        'ciudad_id'        => $data['ciudad_id'],
        'celular'          => $data['celular'],
        'correo'           => $data['correo'],
        'negocio'          => $data['negocio'] ?? null,
        'fuente'           => 'Fase Inicial',
        'fuente_especifica'=> 'Pendiente de Aval',
        'estado'           => 'Entrevista',
        'fecha_postulacion'=> now()->toDateString(),
        'pruebas'          => false,
        'aval'             => false,
        'created_at'       => now(),
        'updated_at'       => now(),
    ]);

    return response()->json(['id' => $candidato], 201);
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

    // Sincronizar candidatos avalados y con pruebas a base de ingresos
    Route::post('base-ingresos/sync', [BaseIngresoController::class, 'sync']);
    // Enviar alerta de ingreso al candidato por correo
    Route::post('base-ingresos/{baseIngreso}/alerta', function (BaseIngreso $baseIngreso) {
        if (!$baseIngreso->correo) {
            return response()->json(['message' => 'El registro no tiene correo electrónico.'], 422);
        }
        try {
            Mail::to($baseIngreso->correo)->send(new AlertaIngresoMail($baseIngreso));
            $baseIngreso->update(['alerta_enviada' => true]);
            return response()->json(['message' => 'Alerta enviada correctamente.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al enviar: ' . $e->getMessage()], 500);
        }
    });
    // CRUD completo de base de ingresos
    Route::apiResource('base-ingresos', BaseIngresoController::class)
        ->parameters(['base-ingresos' => 'baseIngreso']);

    // CRUD completo de requisiciones y candidatos
    Route::apiResource('requisiciones', RequisicionController::class)
        ->parameters(['requisiciones' => 'requisicion']);
    Route::apiResource('candidatos', CandidatoController::class)
        ->parameters(['candidatos' => 'candidato']);
    Route::get('candidatos/{candidato}/documentos', [CandidatoDocumentoController::class, 'index']);
    Route::post('candidatos/{candidato}/documentos', [CandidatoDocumentoController::class, 'store']);
    Route::get('candidatos/{candidato}/documentos/{documento}/download', [CandidatoDocumentoController::class, 'download']);
    Route::delete('candidatos/{candidato}/documentos/{documento}', [CandidatoDocumentoController::class, 'destroy']);

    // Catálogos para el módulo de selección (cargos, proyectos, responsables, ciudades)
    Route::get('/seleccion/catalogos', function () {
        return response()->json([
            'cargos'       => DB::table('cargos')->select('id', 'nombre')->orderBy('nombre')->get(),
            'proyectos'    => DB::table('proyectos')->where('activo', true)->orderBy('nombre')
                               ->get(['id', 'nombre'])
                               ->map(fn($p) => ['value' => $p->id, 'label' => $p->nombre])
                               ->values(),
            'responsables' => DB::table('users')
                               ->whereNotNull('name')->where('name', '!=', '')
                               ->orderBy('name')
                               ->get(['name', 'cedula', 'cargo']),
            'ciudades'     => DB::table('ciudades')->select('id', 'nombre')->orderBy('nombre')->get(),
            'empleadores'  => DB::table('empleadores')->select('id', 'nombre')->orderBy('nombre')->get(),
        ]);
    });

    // Respuestas del formulario de nuevos ingresos (Guardado sin migración en JSON)
    Route::get('/respuestas-ingresos', function () {
        $path = storage_path('app/respuestas_ingresos.json');
        if (!file_exists($path)) {
            return response()->json([]);
        }
        $data = json_decode(file_get_contents($path), true) ?: [];
        return response()->json($data);
    });

    // Documentos de contratación por candidato (admin)
    Route::get('/documentos-contratacion/{documento}', function ($documento) {
        $metaPath = storage_path('app/documentos_contratacion.json');
        if (!file_exists($metaPath)) return response()->json(null);
        $meta = json_decode(file_get_contents($metaPath), true) ?: [];
        return response()->json($meta[$documento] ?? null);
    });

    Route::get('/documentos-contratacion/{documento}/{tipo}/download', function ($documento, $tipo) {
        $metaPath = storage_path('app/documentos_contratacion.json');
        abort_unless(file_exists($metaPath), 404);
        $meta    = json_decode(file_get_contents($metaPath), true) ?: [];
        $archivo = $meta[$documento]['archivos'][$tipo] ?? null;
        abort_unless($archivo, 404);
        abort_unless(Storage::disk('local')->exists($archivo['ruta']), 404);
        return response()->download(
            Storage::disk('local')->path($archivo['ruta']),
            $archivo['nombre_original']
        );
    });

    Route::delete('/documentos-contratacion/{documento}/{tipo}', function ($documento, $tipo) {
        $metaPath = storage_path('app/documentos_contratacion.json');
        if (!file_exists($metaPath)) return response()->json(['message' => 'No encontrado.'], 404);
        $meta = json_decode(file_get_contents($metaPath), true) ?: [];
        if (!isset($meta[$documento]['archivos'][$tipo])) {
            return response()->json(['message' => 'Documento no encontrado.'], 404);
        }
        Storage::disk('local')->delete($meta[$documento]['archivos'][$tipo]['ruta']);
        unset($meta[$documento]['archivos'][$tipo]);
        file_put_contents($metaPath, json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        return response()->json(null, 204);
    });

    Route::delete('/respuestas-ingresos/{id}', function ($id) {
        $path = storage_path('app/respuestas_ingresos.json');
        if (!file_exists($path)) {
            return response()->json(['message' => 'No se encontraron respuestas.'], 404);
        }
        $data = json_decode(file_get_contents($path), true) ?: [];
        $filtered = array_values(array_filter($data, fn($item) => $item['id'] !== $id));
        file_put_contents($path, json_encode($filtered, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        return response()->json(null, 204);
    });
});

// Carga pública de documentos de contratación (candidato sube sus propios archivos)
Route::post('/documentos-contratacion/upload', function (Request $request) {
    $request->validate([
        'documento' => 'required|string|max:40',
        'tipo'      => 'required|string|max:120',
        'archivo'   => 'required|file|max:10240',
    ]);

    $documento = $request->input('documento');
    $tipo      = $request->input('tipo');
    $file      = $request->file('archivo');
    $ext       = $file->getClientOriginalExtension() ?: 'pdf';
    $dirSafe   = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $documento);
    $tipSafe   = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $tipo);
    $path      = $file->storeAs("documentos_contratacion/{$dirSafe}", "{$tipSafe}.{$ext}", 'local');

    $metaPath = storage_path('app/documentos_contratacion.json');
    $meta     = file_exists($metaPath) ? (json_decode(file_get_contents($metaPath), true) ?: []) : [];

    if (!isset($meta[$documento])) {
        $meta[$documento] = ['documento' => $documento, 'archivos' => [], 'created_at' => now()->toDateTimeString()];
    }
    $meta[$documento]['archivos'][$tipo] = [
        'ruta'            => $path,
        'nombre_original' => $file->getClientOriginalName(),
        'uploaded_at'     => now()->toDateTimeString(),
    ];
    $meta[$documento]['updated_at'] = now()->toDateTimeString();

    file_put_contents($metaPath, json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    return response()->json(['message' => 'Documento subido correctamente.'], 201);
});

// Prefill público del formulario de registro usando token (cédula cifrada)
Route::get('/registro-nuevos-ingresos/prefill', function (Request $request) {
    try {
        $cedula  = Crypt::decryptString(urldecode($request->query('token', '')));
        $ingreso = BaseIngreso::where('documento_identificacion', $cedula)->latest()->first();
        if (!$ingreso) return response()->json(null, 404);

        $partes    = preg_split('/\s+/', trim($ingreso->nombre_completo ?? ''), 2);
        $nombres   = $partes[0] ?? '';
        $apellidos = $partes[1] ?? '';

        return response()->json([
            'documento' => $ingreso->documento_identificacion,
            'nombres'   => $nombres,
            'apellidos' => $apellidos,
            'correo'    => $ingreso->correo ?? '',
            'celular'   => $ingreso->telefono ?? '',
            'ciudad'    => strtoupper($ingreso->ciudad ?? ''),
        ]);
    } catch (\Exception) {
        return response()->json(null, 400);
    }
});

// Registro público de nuevos ingresos (Guardado en JSON para llenado manual por el usuario)
Route::post('/registro-nuevos-ingresos/submit', function (Request $request) {
    $data = $request->validate([
        'documento' => 'required|string|max:40',
        'nombres' => 'required|string|max:200',
        'apellidos' => 'required|string|max:200',
        'fecha_nacimiento' => 'required|date',
        'lugar_nacimiento' => 'required|string|max:200',
        'estado_civil' => 'required|string|max:50',
        'numero_hijos' => 'required|string|max:10',
        'rh' => 'required|string|max:10',
        'nivel_escolaridad' => 'required|string|max:100',
        'profesion' => 'required|string|max:150',
        'ciudad' => 'required|string|max:150',
        'barrio' => 'required|string|max:150',
        'direccion' => 'required|string|max:250',
        'estrato' => 'required|string|max:10',
        'correo' => 'required|email|max:180',
        'celular' => 'required|string|max:30',
        'emergencia_nombre' => 'required|string|max:200',
        'emergencia_telefono' => 'required|string|max:30',
        'emergencia_parentesco' => 'required|string|max:100',
        'eps' => 'required|string|max:150',
        'afp' => 'required|string|max:150',
        'talla_camisa' => 'required|string|max:20',
        'talla_pantalon' => 'required|string|max:20',
        'talla_zapatos' => 'required|string|max:20',
    ]);

    $path = storage_path('app/respuestas_ingresos.json');
    $responses = [];
    if (file_exists($path)) {
        $responses = json_decode(file_get_contents($path), true) ?: [];
    }

    $data['id'] = time() . '_' . rand(1000, 9999);
    $data['created_at'] = now()->toDateTimeString();
    
    $responses[] = $data;

    if (!file_exists(dirname($path))) {
        mkdir(dirname($path), 0755, true);
    }
    file_put_contents($path, json_encode($responses, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    return response()->json(['message' => 'Información registrada con éxito.'], 201);
});

