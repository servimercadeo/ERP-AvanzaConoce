<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contrato;
use App\Models\Empresa;
use App\Models\RespuestaIngreso;
use App\Models\User;
use App\Services\EmpresaProyectoRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EmpleadoController extends Controller
{
    public function index(Request $request)
    {
        $users = User::with([
                'empresa',
                'sedeCatalogo',
                'contratos' => function($q) {
                    $q->orderBy('fecha_ingreso', 'desc');
                },
                // Cada Contrato resuelve su atributo `sede` contra este catálogo (ver
                // HasSedeCatalogo); sin precargarlo aquí, se dispara una consulta por
                // cada contrato al serializar la respuesta (N+1 severo con cientos de
                // empleados).
                'contratos.sedeCatalogo',
            ])
            ->whereNotNull('cedula')
            ->where('cedula', '!=', '')
            // Por defecto solo se listan empleados ya dados de alta en este módulo.
            // Pedidos Automáticos / Contratos piden `con_contrato=1` para incluir también
            // a quienes aún no tienen la alta manual pero ya cuentan con un contrato
            // (p. ej. importados en bloque vía ImportarContratosActivosCommand): basta con
            // tener contrato para poder asignarles dotación, sin exigir la ficha completa.
            ->where(function ($q) use ($request) {
                $q->where('pendiente_alta', false);
                if ($request->boolean('con_contrato')) {
                    $q->orWhereHas('contratos');
                }
            })
            ->orderByRaw('apellidos IS NULL ASC, apellidos ASC')
            ->orderByRaw('nombres IS NULL ASC, nombres ASC')
            ->get();

        $cedulas = $users->pluck('cedula')->filter()->unique()->values()->toArray();

        // Todo lo que sigue reemplaza ~14 consultas POR EMPLEADO (N+1) por un puñado de
        // consultas en bloque (whereIn) resueltas una sola vez para toda la lista, y luego
        // se resuelve cada empleado en memoria. Con cientos de empleados esto es la
        // diferencia entre miles de queries y una decena.

        $respuestasPorCedula = RespuestaIngreso::whereIn('documento', $cedulas)
            ->orderBy('id')
            ->get()
            ->unique('documento')
            ->keyBy('documento');

        $candidatosPorCedula = DB::table('candidatos')
            ->whereIn('identificacion', $cedulas)
            ->orderBy('id')
            ->get()
            ->unique('identificacion')
            ->keyBy('identificacion');

        $ciudadCandidatoPorCedula = DB::table('candidatos')
            ->join('ciudades', 'candidatos.ciudad_id', '=', 'ciudades.id')
            ->whereIn('candidatos.identificacion', $cedulas)
            ->orderBy('candidatos.id')
            ->select('candidatos.identificacion', 'ciudades.nombre as ciudad')
            ->get()
            ->unique('identificacion')
            ->keyBy('identificacion');

        $baseIngresosPorCedula = DB::table('base_ingresos')
            ->join('candidatos', 'base_ingresos.candidato_id', '=', 'candidatos.id')
            ->whereIn('candidatos.identificacion', $cedulas)
            ->select('candidatos.identificacion', 'base_ingresos.ciudad', 'base_ingresos.salario_basico', 'base_ingresos.created_at')
            ->get()
            ->groupBy('identificacion');

        $empresaPorCedula = DB::table('candidatos')
            ->join('requisiciones', 'candidatos.requisicion_id', '=', 'requisiciones.id')
            ->whereIn('candidatos.identificacion', $cedulas)
            ->whereNotNull('requisiciones.empresa_id')
            ->orderBy('candidatos.id')
            ->select('candidatos.identificacion', 'requisiciones.empresa_id')
            ->get()
            ->unique('identificacion')
            ->keyBy('identificacion');

        $generosValidos = ['Masculino', 'Femenino', 'Otro', 'No binario', 'Prefiero no decir'];

        return response()->json(
            $users->map(function ($user) use (
                $respuestasPorCedula, $candidatosPorCedula, $ciudadCandidatoPorCedula,
                $baseIngresosPorCedula, $empresaPorCedula, $generosValidos
            ) {
                $cedula = $user->cedula ?? '';
                $respuesta = $respuestasPorCedula->get($cedula);
                $candidato = $candidatosPorCedula->get($cedula);
                $baseIngresoRows = $baseIngresosPorCedula->get($cedula);

                // 1. respuestas_ingresos → 2. candidatos (join ciudades) → 3. base_ingresos
                $user->ciudad = $respuesta?->ciudad
                    ?: $ciudadCandidatoPorCedula->get($cedula)?->ciudad
                    ?: $baseIngresoRows?->first()?->ciudad;

                // Género: usar users.genero si es un valor reconocido; si no, el de candidatos
                if (!in_array($user->genero, $generosValidos)) {
                    $user->genero = $candidato?->genero;
                }

                // Fotografía: si users no tiene, buscar primero en respuestas_ingresos (el
                // formulario de ingreso es donde se captura hoy) y si tampoco hay, en
                // candidatos (fuente antigua, previa a que el campo se moviera aquí).
                if (!$user->fotografia) {
                    $user->fotografia = $respuesta?->fotografia ?: $candidato?->fotografia;
                }
                $user->talla_camisa   = $user->talla_camisa   ?: ($respuesta?->talla_camisa   ?? null);
                $user->talla_pantalon = $user->talla_pantalon ?: ($respuesta?->talla_pantalon ?? null);
                $user->talla_zapatos  = $user->talla_zapatos  ?: ($respuesta?->talla_zapatos  ?? null);
                $user->profesion      = $user->profesion      ?: ($respuesta?->profesion      ?? null);
                if ($respuesta) {
                    $user->estado_civil         = $user->estado_civil         ?: $respuesta->estado_civil;
                    $user->nivel_escolaridad    = $user->nivel_escolaridad    ?: $respuesta->nivel_escolaridad;
                    $user->estrato              = $user->estrato              ?: $respuesta->estrato;
                    $user->barrio               = $user->barrio               ?: $respuesta->barrio;
                    $user->numero_hijos         = $user->numero_hijos         ?: $respuesta->numero_hijos;
                    $user->rh                   = $user->rh                   ?: $respuesta->rh;
                    $user->fecha_nacimiento     = $user->fecha_nacimiento     ?: $respuesta->fecha_nacimiento;
                    $user->lugar_nacimiento     = $user->lugar_nacimiento     ?: $respuesta->lugar_nacimiento;
                    $user->direccion_residencia = $user->direccion_residencia ?: $respuesta->direccion;
                    $user->contacto_emergencia_nombre     = $user->contacto_emergencia_nombre     ?: $respuesta->emergencia_nombre;
                    $user->contacto_emergencia_telefono   = $user->contacto_emergencia_telefono   ?: $respuesta->emergencia_telefono;
                    $user->contacto_emergencia_parentesco = $user->contacto_emergencia_parentesco ?: $respuesta->emergencia_parentesco;
                    $user->eps             = $user->eps             ?: $respuesta->eps;
                    $user->fondo_pensiones = $user->fondo_pensiones ?: $respuesta->afp;
                }

                // fecha_expedicion desde candidatos
                if (!$user->fecha_expedicion) {
                    $user->fecha_expedicion = $candidato?->fecha_expedicion;
                }

                // Móvil: si está vacío o es el placeholder por defecto
                if (!$user->movil || $user->movil === '0000000000') {
                    $celular = $respuesta?->celular ?? $candidato?->celular;
                    if ($celular) $user->movil = $celular;
                }

                // Email: si parece auto-generado (cedula@dominio)
                if ($cedula && $user->email && str_starts_with($user->email, $cedula . '@')) {
                    $realEmail = $respuesta?->correo ?? $candidato?->correo;
                    if ($realEmail) $user->email = $realEmail;
                }

                // Caja Compensación: desde contratos (ya cargados y ordenados por fecha_ingreso
                // desc vía el eager load de arriba, no hace falta volver a consultar) → candidatos
                if (!$user->caja_compensacion) {
                    $contratoConCaja = $user->contratos->first(fn($c) => !is_null($c->caja_compensacion));
                    $caja = $contratoConCaja?->caja_compensacion ?: $candidato?->caja_compensacion;
                    if ($caja) $user->caja_compensacion = $caja;
                }

                // Empresa: desde requisicion del candidato si no tiene empresa_id
                if (!$user->empresa_id) {
                    $empresaId = $empresaPorCedula->get($cedula)?->empresa_id;
                    if ($empresaId) $user->empresa_id = $empresaId;
                }

                // Ingresos: si nulo, buscar en contratos (ya cargados) → base_ingresos (más
                // reciente) → candidatos
                if (is_null($user->ingresos) || $user->ingresos == 0) {
                    $contratoConSalario = $user->contratos->first(fn($c) => !is_null($c->salario));
                    $salario = $contratoConSalario?->salario;
                    if (!$salario && $baseIngresoRows) {
                        $salario = $baseIngresoRows->whereNotNull('salario_basico')
                            ->sortByDesc('created_at')
                            ->first()?->salario_basico;
                    }
                    if (!$salario) $salario = $candidato?->salario_basico;
                    if ($salario) $user->ingresos = $salario;
                }

                return $user;
            })
        );
    }

    public function store(Request $request)
    {
        $userByCedula = null;
        $userByEmail = null;

        if ($request->cedula) {
            $userByCedula = User::where('cedula', $request->cedula)->first();
        }
        if ($request->email) {
            $userByEmail = User::where('email', $request->email)->first();
        }

        $existingId = null;
        if ($userByCedula && $userByEmail && $userByCedula->id !== $userByEmail->id) {
            // Re-link contracts to userByEmail
            \App\Models\Contrato::where('empleado_id', $userByCedula->id)
                ->update(['empleado_id' => $userByEmail->id]);
            
            // Delete the duplicate userByCedula
            $userByCedula->delete();

            $existingId = $userByEmail->id;
        } else if ($userByCedula) {
            $existingId = $userByCedula->id;
        } else if ($userByEmail) {
            $existingId = $userByEmail->id;
        }

        $data = $request->validate($this->rules($existingId));

        $this->normalizarNombres($data);
        $data['name']   = trim($data['nombres'] . ' ' . $data['apellidos']);

        if ($request->hasFile('fotografia')) {
            $data['fotografia'] = $request->file('fotografia')->store('empleados/fotos', 'public');
        } elseif (!array_key_exists('fotografia', $data) || $data['fotografia'] === null) {
            unset($data['fotografia']);
        }

        if ($existingId) {
            $empleado = User::find($existingId);
            $this->validarEmpresaSegunProyecto($data, $empleado);

            // El registro existente vino de un import (p. ej. de contratos) y todavía no se
            // dio de alta manualmente aquí — esta es su alta real, así que se le generan
            // credenciales nuevas en vez de tratarlo como una simple actualización.
            if ($empleado->pendiente_alta) {
                $data['rol']            = $data['rol'] ?? 'consultor';
                $data['activo']         = true;
                $data['pendiente_alta'] = false;

                $plainPassword     = strtoupper(Str::random(2)) . strtolower(Str::random(5)) . rand(100, 999);
                $data['password']  = Hash::make($plainPassword);

                $empleado->update($data);

                app(\App\Services\EmpleadoSyncService::class)->syncFromUser($empleado);

                return response()->json([
                    'empleado'     => $empleado->fresh()->load(['empresa', 'sedeCatalogo']),
                    'credenciales' => [
                        'email'    => $empleado->email,
                        'password' => $plainPassword,
                    ],
                ], 201);
            }

            $empleado->update($data);
            return response()->json([
                'empleado'     => $empleado->fresh()->load(['empresa', 'sedeCatalogo']),
                'credenciales' => [
                    'email'    => $empleado->email,
                    'password' => '(Ya registrado)',
                ],
            ], 201);
        }

        $data['rol']    = $data['rol'] ?? 'consultor';
        $data['activo'] = true;

        // Contraseña temporal de 10 caracteres: 2 mayúsculas + 5 minúsculas + 3 dígitos
        $plainPassword  = strtoupper(Str::random(2)) . strtolower(Str::random(5)) . rand(100, 999);
        $data['password'] = Hash::make($plainPassword);

        $empleado = User::create($data);

        app(\App\Services\EmpleadoSyncService::class)->syncFromUser($empleado);

        return response()->json([
            'empleado'     => $empleado->load(['empresa', 'sedeCatalogo']),
            'credenciales' => [
                'email'    => $empleado->email,
                'password' => $plainPassword,
            ],
        ], 201);
    }

    public function show(User $empleado)
    {
        return response()->json($empleado->load(['empresa', 'sedeCatalogo']));
    }

    public function update(Request $request, User $empleado)
    {
        // Si el correo ya pertenece a OTRO usuario, Rule::unique (ignorando solo a este empleado)
        // responde 422. Antes se "fusionaba": se borraba al empleado editado y se sobrescribía
        // al otro, así que un error de tipeo en el correo eliminaba a una persona real.
        $data = $request->validate($this->rules($empleado->id));

        $this->normalizarNombres($data);
        $data['name'] = trim($data['nombres'] . ' ' . $data['apellidos']);

        if ($request->hasFile('fotografia')) {
            $data['fotografia'] = $request->file('fotografia')->store('empleados/fotos', 'public');
        } elseif (!array_key_exists('fotografia', $data) || $data['fotografia'] === null) {
            unset($data['fotografia']);
        }

        $this->validarEmpresaSegunProyecto($data, $empleado);

        $empleado->update($data);

        app(\App\Services\EmpleadoSyncService::class)->syncFromUser($empleado->fresh());

        return response()->json($empleado->fresh()->load(['empresa', 'sedeCatalogo']));
    }

    public function updateTallas(Request $request, User $empleado)
    {
        $data = $request->validate([
            'talla_camisa'   => 'nullable|string|max:20',
            'talla_pantalon' => 'nullable|string|max:20',
            'talla_zapatos'  => 'nullable|string|max:20',
        ]);

        // Guardar en users
        $empleado->update($data);

        // Guardar también en respuestas_ingresos para que "Respuestas Nuevos Ingresos" refleje el cambio
        if ($empleado->cedula) {
            \App\Models\RespuestaIngreso::where('documento', $empleado->cedula)
                ->update($data);
        }

        return response()->json([
            'id'             => $empleado->id,
            'talla_camisa'   => $empleado->talla_camisa,
            'talla_pantalon' => $empleado->talla_pantalon,
            'talla_zapatos'  => $empleado->talla_zapatos,
        ]);
    }

    public function updateFotografia(Request $request, User $empleado)
    {
        $data = $request->validate([
            'fotografia' => 'required|image|max:5120',
        ]);

        $empleado->update([
            'fotografia' => $request->file('fotografia')->store('empleados/fotos', 'public'),
        ]);

        return response()->json([
            'id'         => $empleado->id,
            'fotografia' => $empleado->fotografia,
        ]);
    }

    /**
     * Importación masiva de datos personales desde Excel, buscando por cédula.
     * Regla de seguridad (no negociable, pisar datos de empleados reales rompería
     * información real): por cada campo, solo se escribe si el valor actual en BD
     * está vacío/NULL (o, solo para `genero`, si vale el placeholder 'No especificado'
     * que deja el alta automática). Un campo que ya tiene dato se deja intacto y se
     * reporta como omitido, nunca se sobreescribe.
     */
    public function importarDatosPersonales(Request $request)
    {
        // Solo se valida que `filas` sea un array no vacío; una fila puntual mal
        // formada (sin cédula, no es objeto, etc.) se descarta más abajo fila por
        // fila, no se rechaza todo el lote por un solo registro raro. `validate()`
        // también descarta cualquier campo sin regla declarada, así que los datos
        // reales se toman del input crudo y se validan campo por campo más abajo.
        $request->validate([
            'filas' => 'required|array|min:1|max:2000',
        ]);
        $filas = $request->input('filas', []);

        $camposPermitidos = [
            'fecha_expedicion', 'genero', 'fecha_nacimiento', 'lugar_nacimiento', 'raza',
            'estado_civil', 'nivel_escolaridad', 'profesion', 'numero_hijos', 'rh', 'movil',
            'direccion_residencia', 'barrio', 'estrato', 'banco', 'tipo_cuenta', 'cuenta_bancaria',
            'talla_camisa', 'talla_pantalon', 'talla_zapatos',
            'contacto_emergencia_nombre', 'contacto_emergencia_telefono', 'contacto_emergencia_parentesco',
        ];

        $resumen = [
            'actualizados'   => 0,
            'sin_cambios'    => 0,
            'no_encontrados' => [],
            'detalle'        => [],
        ];

        DB::transaction(function () use ($filas, $camposPermitidos, &$resumen) {
            foreach ($filas as $fila) {
                if (!is_array($fila)) continue;
                $cedula = trim((string) ($fila['cedula'] ?? ''));
                if ($cedula === '') continue;

                $user = User::where('cedula', $cedula)->first();
                if (!$user) {
                    $resumen['no_encontrados'][] = $cedula;
                    continue;
                }

                $actualizadosFila = [];
                $omitidosFila = [];

                foreach ($camposPermitidos as $campo) {
                    if (!array_key_exists($campo, $fila)) continue;
                    $valor = $fila[$campo];
                    $valor = is_string($valor) ? trim($valor) : $valor;
                    if ($valor === null || $valor === '') continue;

                    if ($campo === 'genero') {
                        $generoUpper = mb_strtoupper((string) $valor, 'UTF-8');
                        if ($generoUpper === 'MASCULINO') {
                            $valor = 'Masculino';
                        } elseif ($generoUpper === 'FEMENINO') {
                            $valor = 'Femenino';
                        } else {
                            continue; // valor de genero no reconocido: se omite este campo (sigue con los demás)
                        }
                    }
                    if ($campo === 'numero_hijos') {
                        if (!is_numeric($valor)) continue;
                        $valor = (int) $valor;
                        if ($valor < 0 || $valor > 20) continue;
                    }
                    if (in_array($campo, ['fecha_nacimiento', 'fecha_expedicion'], true)) {
                        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $valor)) continue;
                        $year = (int) substr((string) $valor, 0, 4);
                        if ($year < 1920 || $year > (int) date('Y')) continue;
                    }

                    $actual = $user->{$campo};
                    $vacioActual = $actual === null || $actual === ''
                        || ($campo === 'genero' && $actual === 'No especificado');

                    if (!$vacioActual) {
                        $omitidosFila[] = $campo;
                        continue;
                    }

                    $user->{$campo} = $valor;
                    $actualizadosFila[] = $campo;
                }

                if (!empty($actualizadosFila)) {
                    $user->save();
                    $resumen['actualizados']++;
                } else {
                    $resumen['sin_cambios']++;
                }

                $resumen['detalle'][] = [
                    'cedula'               => $cedula,
                    'nombre'               => trim(($user->nombres ?? '') . ' ' . ($user->apellidos ?? '')),
                    'campos_actualizados'  => $actualizadosFila,
                    'campos_omitidos'      => $omitidosFila,
                ];
            }
        });

        return response()->json($resumen);
    }

    public function destroy(User $empleado)
    {
        $empleado->delete();

        return response()->json(null, 204);
    }

    public function candidatosListos(\Illuminate\Http\Request $request)
    {
        // Usuarios que tienen al menos un contrato vigente (completado = true)
        $query = User::with(['empresa'])
            ->whereHas('contratos', fn($q) => $q->where('completado', true));

        if ($request->search) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nombres',   'like', "%$s%")
                  ->orWhere('apellidos', 'like', "%$s%")
                  ->orWhere('name',      'like', "%$s%")
                  ->orWhere('cedula',    'like', "%$s%");
            });
            $query->orderBy('nombres')->limit(30);
        } else {
            // Sin búsqueda: los 5 usuarios con el contrato más reciente
            $latestContrato = \App\Models\Contrato::select('created_at')
                ->whereColumn('empleado_id', 'users.id')
                ->where('completado', true)
                ->orderByDesc('created_at')
                ->limit(1);
            $query->orderByDesc($latestContrato)->limit(5);
        }

        return response()->json(
            $query->get()->map(function ($user) {
                $toDate = fn($v) => $v ? \Carbon\Carbon::parse($v)->format('Y-m-d') : null;

                // 1. Último contrato vigente
                $contrato = \App\Models\Contrato::where('empleado_id', $user->id)
                    ->where('completado', true)
                    ->latest()
                    ->first();

                // 2. Candidato vinculado por cédula
                $candidato = $user->cedula
                    ? \App\Models\Candidato::with(['requisicion.empresa', 'requisicion.empleador'])
                        ->where('identificacion', $user->cedula)
                        ->first()
                    : null;

                // 3. Base de ingresos del candidato
                $ingreso = $candidato
                    ? \App\Models\BaseIngreso::where('candidato_id', $candidato->id)->first()
                    : null;

                // 4. Respuesta de ingreso (formulario personal del empleado)
                $respuesta = $user->cedula
                    ? \App\Models\RespuestaIngreso::where('documento', $user->cedula)->first()
                    : null;

                $req = $candidato?->requisicion;

                return [
                    // ── Identificación
                    'user_id'          => $user->id,
                    'cedula'           => $user->cedula,
                    'nombres'          => $user->nombres           ?? $respuesta?->nombres  ?? $user->name,
                    'apellidos'        => $user->apellidos         ?? $respuesta?->apellidos ?? '',
                    'email'            => $user->email             ?? $respuesta?->correo   ?? $candidato?->correo ?? $ingreso?->correo,
                    'movil'            => $user->movil             ?? $respuesta?->celular  ?? $candidato?->celular ?? $ingreso?->telefono,
                    'genero'           => $user->genero,
                    'fecha_expedicion' => $toDate($user->fecha_expedicion ?? $candidato?->fecha_expedicion),

                    // ── Datos personales (respuesta_ingreso > user)
                    'fecha_nacimiento'     => $toDate($respuesta?->fecha_nacimiento  ?? $user->fecha_nacimiento),
                    'lugar_nacimiento'     => $respuesta?->lugar_nacimiento          ?? $user->lugar_nacimiento,
                    'estado_civil'         => $respuesta?->estado_civil              ?? $user->estado_civil,
                    'nivel_escolaridad'    => $respuesta?->nivel_escolaridad         ?? $user->nivel_escolaridad,
                    'profesion'            => $respuesta?->profesion                 ?? $user->profesion,
                    'direccion_residencia' => $respuesta?->direccion                 ?? $user->direccion_residencia,
                    'estrato'              => $respuesta?->estrato                   ?? $user->estrato,
                    'barrio'               => $respuesta?->barrio                    ?? $user->barrio,
                    'numero_hijos'         => $respuesta?->numero_hijos              ?? $user->numero_hijos,
                    'rh'                   => $respuesta?->rh                        ?? $user->rh,
                    'talla_camisa'         => $user->talla_camisa    ?? $respuesta?->talla_camisa,
                    'talla_pantalon'       => $user->talla_pantalon  ?? $respuesta?->talla_pantalon,
                    'talla_zapatos'        => $user->talla_zapatos   ?? $respuesta?->talla_zapatos,

                    // ── Seguridad social (contrato > respuesta > candidato > user)
                    'eps'              => $respuesta?->eps              ?? $contrato?->lps_afiliado ?? $user->eps,
                    'arl'              => $contrato?->arl               ?? $candidato?->arl         ?? $user->arl,
                    'fondo_pensiones'  => $contrato?->fondo_pensiones   ?? $respuesta?->afp         ?? $user->fondo_pensiones,
                    'caja_compensacion'=> $contrato?->caja_compensacion ?? $candidato?->caja_compensacion ?? $user->caja_compensacion,

                    // ── Datos laborales (contrato > ingreso > user)
                    'cargo'            => $contrato?->cargo           ?? $ingreso?->cargo         ?? $user->cargo,
                    'sede'             => $contrato?->sede            ?? $user->sede,
                    'tipo_vinculacion' => $contrato?->tipo_vinculacion ?? $candidato?->tipo_vinculacion ?? $ingreso?->tipo_ingreso,
                    'tipo_funcionario' => $user->tipo_funcionario,
                    'empleador'        => $contrato?->empleador       ?? $ingreso?->empleador     ?? $req?->empleador?->nombre ?? $user->empleador,
                    'jefe_inmediato'   => $contrato?->jefe_inmediato  ?? $ingreso?->lider_inmediato ?? $user->jefe_inmediato,
                    'empresa_id'       => $user->empresa_id           ?? $req?->empresa_id,
                    'empresa_nombre'   => $user->empresa?->nombre     ?? $ingreso?->empresa       ?? $req?->empresa?->nombre,
                    'ingresos'         => $contrato?->salario         ?? $ingreso?->salario_basico ?? $candidato?->salario_basico,

                    // ── Contacto de emergencia (respuesta > user)
                    'contacto_emergencia_nombre'      => $respuesta?->emergencia_nombre      ?? $user->contacto_emergencia_nombre,
                    'contacto_emergencia_telefono'    => $respuesta?->emergencia_telefono    ?? $user->contacto_emergencia_telefono,
                    'contacto_emergencia_parentesco'  => $respuesta?->emergencia_parentesco  ?? $user->contacto_emergencia_parentesco,
                ];
            })
        );
    }

    /**
     * El formulario de Empleado no tiene un campo "proyecto" propio — el proyecto
     * (cliente_proyecto) vive en los Contratos. Por eso, para validar la empresa elegida aquí,
     * se toma el cliente_proyecto del contrato más reciente del empleado (si tiene alguno) y se
     * reutiliza la misma regla que ya bloquea combinaciones inválidas en Contratos.
     */
    private function validarEmpresaSegunProyecto(array $data, ?User $empleadoActual): void
    {
        $empresaId = $data['empresa_id'] ?? $empleadoActual?->empresa_id;
        if (!$empresaId || !$empleadoActual) {
            return;
        }

        $proyecto = Contrato::where('empleado_id', $empleadoActual->id)
            ->orderByDesc('fecha_ingreso')
            ->value('cliente_proyecto');
        if (!$proyecto) {
            return;
        }

        $empresaNombre = Empresa::find($empresaId)?->nombre;
        if ($msg = EmpresaProyectoRules::validar($empresaNombre, $proyecto)) {
            throw ValidationException::withMessages(['empresa_id' => $msg]);
        }
    }

    private function normalizarNombres(array &$data): void
    {
        $campos = ['nombres', 'apellidos', 'cargo', 'fondo_pensiones', 'arl', 'tipo_funcionario', 'eps', 'caja_compensacion'];
        foreach ($campos as $campo) {
            if (isset($data[$campo])) {
                $data[$campo] = mb_strtoupper($data[$campo], 'UTF-8');
            }
        }
    }

    private function rules(?int $ignoreId = null): array
    {
        return [
            // Obligatorios
            'cedula'           => 'required|string|max:20',
            'apellidos'        => 'required|string|max:150',
            'nombres'          => 'required|string|max:150',
            'sede'             => 'required|string|max:100',
            'genero'           => 'required|string|max:50',
            'movil'            => 'required|string|max:20',
            'email'            => ['required', 'email', Rule::unique('users', 'email')->ignore($ignoreId)],
            'eps'              => 'required|string|max:100',
            'arl'              => 'required|string|max:100',
            'fondo_pensiones'  => 'nullable|string|max:100',
            'estado_empleado'  => 'required|string|max:50',
            'cargo'            => 'required|string|max:150',
            'tipo_funcionario' => 'required|string|max:100',
            'tipo_vinculacion' => 'required|string|max:100',

            // Opcionales
            'fotografia'           => 'nullable|max:5120',
            'fecha_expedicion'     => 'nullable|date',
            'fecha_nacimiento'     => 'nullable|date',
            'lugar_nacimiento'     => 'nullable|string|max:150',
            'raza'                 => 'nullable|string|max:80',
            'estado_civil'         => 'nullable|string|max:50',
            'nivel_escolaridad'    => 'nullable|string|max:80',
            'profesion'            => 'nullable|string|max:150',
            'direccion_residencia' => 'nullable|string|max:250',
            'estrato'              => 'nullable|string|max:5',
            'barrio'               => 'nullable|string|max:100',
            'numero_hijos'         => 'nullable|integer|min:0',
            'ingresos'             => 'nullable|numeric|min:0',
            'observaciones_medicas'=> 'nullable|string',
            'alergias'             => 'nullable|string',
            'talla_camisa'         => 'nullable|string|max:20',
            'talla_pantalon'       => 'nullable|string|max:20',
            'talla_zapatos'        => 'nullable|string|max:20',
            'rh'                   => 'nullable|string|max:5',
            'caja_compensacion'    => 'nullable|string|max:100',
            'licencia_carro'       => 'nullable|string|max:20',
            'licencia_carro_vence' => 'nullable|date',
            'licencia_moto'        => 'nullable|string|max:20',
            'licencia_moto_vence'  => 'nullable|date',
            'tiene_cert_alturas'   => 'nullable|boolean',
            'cert_alturas_vence'   => 'nullable|date',
            'codigo_directv'       => 'nullable|string|max:30',
            'empresa_id'           => 'nullable|exists:empresas,id',
            'comentarios'          => 'nullable|string',
            'contacto_emergencia_nombre'     => 'nullable|string|max:150',
            'contacto_emergencia_telefono'   => 'nullable|string|max:20',
            'contacto_emergencia_parentesco' => 'nullable|string|max:80',
            'cuenta_bancaria'      => 'nullable|string|max:30',
            'tipo_cuenta'          => 'nullable|string|max:30',
            'banco'                => 'nullable|string|max:100',
        ];
    }
}
