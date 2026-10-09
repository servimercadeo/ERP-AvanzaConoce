<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contrato;
use App\Models\RespuestaIngreso;
use App\Models\User;
use App\Services\AltaEnAvanzaConoce;
use App\Services\CredencialesAvanzaConoce;
use App\Services\IdentidadUnica;
use App\Services\ImportacionExcelValidador;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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
                // Una ruta cuyo archivo ya no existe cuenta como "sin foto".
                if (!User::fotoExiste($user->fotografia)) {
                    $user->fotografia = $respuesta?->fotografia ?: $candidato?->fotografia ?: $user->fotografia;
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

        // Un correo que ya es de OTRA persona (otra cédula) no es un duplicado del mismo
        // empleado: fusionarlos le pasaría los contratos a esa persona y borraría a este.
        if ($userByEmail && $request->cedula && $userByEmail->cedula
            && (string) $userByEmail->cedula !== (string) $request->cedula) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'email' => "El correo {$request->email} ya está registrado para otro empleado (cédula {$userByEmail->cedula}). Usa otro correo.",
            ]);
        }

        $existingId = null;
        if ($userByCedula && $userByEmail && $userByCedula->id !== $userByEmail->id) {
            // Re-link contracts to userByEmail
            Contrato::where('empleado_id', $userByCedula->id)
                ->update(['empleado_id' => $userByEmail->id]);
            
            // Delete the duplicate userByCedula
            $userByCedula->delete();

            $existingId = $userByEmail->id;
        } else if ($userByCedula) {
            $existingId = $userByCedula->id;
        } else if ($userByEmail) {
            $existingId = $userByEmail->id;
        }

        $data = $request->validate($this->rules($existingId, $existingId ? User::find($existingId) : null));
        // El correo tampoco puede ser de otra persona en candidatos o formularios de ingreso.
        if ($msg = IdentidadUnica::correoDeOtraPersona($data['email'] ?? null, $data['cedula'] ?? null)) {
            throw ValidationException::withMessages(['email' => $msg]);
        }
        if ($msg = IdentidadUnica::telefonoDeOtraPersona($data['movil'] ?? null, $data['cedula'] ?? null, $existingId)) {
            throw ValidationException::withMessages(['movil' => $msg]);
        }

        $this->normalizarNombres($data);
        $data['name']   = trim($data['nombres'] . ' ' . $data['apellidos']);

        if ($request->hasFile('fotografia')) {
            $data['fotografia'] = $request->file('fotografia')->store('empleados/fotos', 'public');
        } elseif (!array_key_exists('fotografia', $data) || $data['fotografia'] === null) {
            unset($data['fotografia']);
        }

        if ($existingId) {
            $empleado = User::find($existingId);
            if ($empleado->rol === 'admin' && Auth::user()?->rol !== 'admin') {
                $data['rol'] = 'admin';
            }

            // El registro existente vino de un import (p. ej. de contratos) y todavía no se
            // dio de alta manualmente aquí — esta es su alta real, así que se le generan
            // credenciales nuevas en vez de tratarlo como una simple actualización.
            if ($empleado->pendiente_alta) {
                $data['rol']            = $data['rol'] ?? 'general';
                $data['activo']         = true;
                $data['pendiente_alta'] = false;

                // Misma contraseña que en AvanzaConoce si ya existe allá; si no, una temporal.
                $credenciales     = CredencialesAvanzaConoce::paraAlta($data['cedula'] ?? $empleado->cedula);
                $data['password'] = $credenciales['hash'];

                $empleado->update($data);
                app(\App\Services\EmpleadoSyncService::class)->syncDesdeUltimoContrato($empleado);

                app(\App\Services\EmpleadoSyncService::class)->syncFromUser($empleado);

                // Mismo usuario y contraseña en AvanzaConoce.
                $credenciales = app(AltaEnAvanzaConoce::class)->sincronizar($empleado->fresh(), $credenciales);

                return response()->json([
                    'empleado'     => $empleado->fresh()->load(['empresa', 'sedeCatalogo']),
                    'credenciales' => [
                        'email'    => $empleado->email,
                        'password' => $credenciales['mostrar'],
                        'de_avanza' => $credenciales['de_avanza'],
                        'avanza'   => $credenciales['avanza'],
                    ],
                ], 201);
            }

            $empleado->update($data);
            app(\App\Services\EmpleadoSyncService::class)->syncDesdeUltimoContrato($empleado);
            return response()->json([
                'empleado'     => $empleado->fresh()->load(['empresa', 'sedeCatalogo']),
                'credenciales' => [
                    'email'    => $empleado->email,
                    'password' => '(Ya registrado)',
                ],
            ], 201);
        }

        $data['rol']    = $data['rol'] ?? 'general';
        $data['activo'] = true;

        // Misma contraseña que en AvanzaConoce si ya existe allá; si no, una temporal.
        $credenciales     = CredencialesAvanzaConoce::paraAlta($data['cedula'] ?? null);
        $data['password'] = $credenciales['hash'];

        $empleado = User::create($data);

        app(\App\Services\EmpleadoSyncService::class)->syncFromUser($empleado);

        // Mismo usuario y contraseña en AvanzaConoce.
        $credenciales = app(AltaEnAvanzaConoce::class)->sincronizar($empleado->fresh(), $credenciales);

        return response()->json([
            'empleado'     => $empleado->load(['empresa', 'sedeCatalogo']),
            'credenciales' => [
                'email'    => $empleado->email,
                'password' => $credenciales['mostrar'],
                'de_avanza' => $credenciales['de_avanza'],
                'avanza'   => $credenciales['avanza'],
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
        $data = $request->validate($this->rules($empleado->id, $empleado));
        if ($msg = IdentidadUnica::correoDeOtraPersona($data['email'] ?? null, $data['cedula'] ?? $empleado->cedula, $empleado->id)) {
            throw ValidationException::withMessages(['email' => $msg]);
        }
        if ($msg = IdentidadUnica::telefonoDeOtraPersona($data['movil'] ?? null, $data['cedula'] ?? $empleado->cedula, $empleado->id)) {
            throw ValidationException::withMessages(['movil' => $msg]);
        }

        $this->normalizarNombres($data);
        $data['name'] = trim($data['nombres'] . ' ' . $data['apellidos']);
        if ($empleado->rol === 'admin' && Auth::user()?->rol !== 'admin') {
            $data['rol'] = 'admin';
        }

        if ($request->hasFile('fotografia')) {
            $data['fotografia'] = $request->file('fotografia')->store('empleados/fotos', 'public');
        } elseif (!array_key_exists('fotografia', $data) || $data['fotografia'] === null) {
            unset($data['fotografia']);
        }

        $empleado->update($data);
        app(\App\Services\EmpleadoSyncService::class)->syncDesdeUltimoContrato($empleado);

        app(\App\Services\EmpleadoSyncService::class)->syncFromUser($empleado->fresh());

        // AvanzaConoce lo había rechazado por un dato (p. ej. correo de otra persona): si se
        // corrigió, vuelve a la cola de reintento (avanza:sincronizar-usuarios).
        if ($empleado->avanza_sync_estado === AltaEnAvanzaConoce::CONFLICTO && $empleado->wasChanged(['email', 'cedula', 'movil', 'nombres', 'apellidos'])) {
            $empleado->forceFill(['avanza_sync_estado' => AltaEnAvanzaConoce::PENDIENTE])->saveQuietly();
        }

        // Igual que en index(): si no tiene foto propia se muestra la del formulario de
        // ingreso, para que el avatar no desaparezca de la lista tras editar.
        $respuesta = $empleado->fresh()->load(['empresa', 'sedeCatalogo']);
        User::completarFotografias([$respuesta]);

        return response()->json($respuesta);
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
        $request->validate([
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
     *
     * Si la cédula encontrada está `pendiente_alta` (creada como cascarón por el import
     * de Contratos, nunca dada de alta aquí), este import también completa su alta —
     * igual que al editarla manualmente en store() — para que deje de estar invisible en
     * el módulo de Empleados. Esto sí genera credenciales nuevas, que se devuelven en el
     * detalle de cada fila porque no hay otra forma de recuperarlas después (la
     * contraseña se guarda ya hasheada).
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

        // NO incluye: cargo (User::booted() deriva `rol` de él al guardarlo — demasiado
        // riesgoso para una carga masiva sin revisión caso por caso), estado_empleado,
        // email, ingresos, empresa_id (cada uno con su propio flujo dedicado). Los campos
        // de Contrato (tipo/estado de contrato, fechas, cliente_proyecto, etc.) los cubre
        // ContratoController@importarDatosFaltantes, no este método.
        $camposPermitidos = [
            'nombres', 'apellidos',
            'fecha_expedicion', 'genero', 'fecha_nacimiento', 'lugar_nacimiento', 'raza',
            'estado_civil', 'nivel_escolaridad', 'profesion', 'numero_hijos', 'rh', 'movil',
            'direccion_residencia', 'barrio', 'estrato',
            'tipo_vinculacion', 'sede', 'empleador',
            'jefe_inmediato', 'jefe_inmediato_correo', 'codigo_directv',
            'eps', 'arl', 'fondo_pensiones', 'caja_compensacion',
            'banco', 'tipo_cuenta', 'cuenta_bancaria',
            'talla_camisa', 'talla_pantalon', 'talla_zapatos',
            'licencia_carro', 'licencia_carro_vence', 'licencia_moto', 'licencia_moto_vence',
            'tiene_cert_alturas', 'cert_alturas_vence',
            'contacto_emergencia_nombre', 'contacto_emergencia_telefono', 'contacto_emergencia_parentesco',
            'observaciones_medicas', 'alergias', 'comentarios',
        ];
        $camposFecha = [
            'fecha_expedicion', 'fecha_nacimiento',
            'licencia_carro_vence', 'licencia_moto_vence', 'cert_alturas_vence',
        ];
        // Límite real de cada columna varchar en `users` (ver migraciones). Un valor más
        // largo rompería el UPDATE completo del lote con un 500 (columna varchar no
        // trunca, lanza SQLSTATE 22001) — mejor omitir solo ese campo, igual que un valor
        // inválido, que perder las 2000 filas por una celda demasiado larga.
        $longitudesMaximas = [
            'nombres' => 100, 'apellidos' => 100, 'genero' => 30, 'lugar_nacimiento' => 100,
            'raza' => 50, 'estado_civil' => 30, 'nivel_escolaridad' => 50, 'profesion' => 150,
            'rh' => 5, 'movil' => 20, 'direccion_residencia' => 200, 'barrio' => 100, 'estrato' => 5,
            'tipo_funcionario' => 80, 'tipo_vinculacion' => 30, 'sede' => 100, 'empleador' => 150,
            'jefe_inmediato' => 150, 'jefe_inmediato_correo' => 180, 'codigo_directv' => 50,
            'eps' => 100, 'arl' => 100, 'fondo_pensiones' => 100, 'caja_compensacion' => 100,
            'banco' => 100, 'tipo_cuenta' => 30, 'cuenta_bancaria' => 30,
            'talla_camisa' => 20, 'talla_pantalon' => 20, 'talla_zapatos' => 20,
            'licencia_carro' => 50, 'licencia_moto' => 50,
            'contacto_emergencia_nombre' => 150, 'contacto_emergencia_telefono' => 20,
            'contacto_emergencia_parentesco' => 80,
        ];

        $resumen = [
            'actualizados'   => 0,
            'dados_de_alta'  => 0,
            'sin_cambios'    => 0,
            'no_encontrados' => [],
            'sin_contrato'   => [],
            'sin_celular'    => [],
            'detalle'        => [],
        ];

        // Altas hechas por el import: se mandan a AvanzaConoce después de guardar (no se
        // llama a otro sistema con la transacción abierta). [índice en detalle, usuario, credenciales]
        $altas = [];

        DB::transaction(function () use ($filas, $camposPermitidos, $camposFecha, $longitudesMaximas, &$resumen, &$altas) {
            foreach ($filas as $fila) {
                if (!is_array($fila) || !is_scalar($fila['cedula'] ?? null)) continue;
                $cedula = trim((string) $fila['cedula']);
                if ($cedula === '') continue;

                $user = User::where('cedula', $cedula)->first();
                if (!$user) {
                    $resumen['no_encontrados'][] = $cedula;
                    continue;
                }
                // Proceso: primero se crea el contrato (Contratos) y después se completa el
                // empleado aquí, que es donde se entregan credenciales. Sin contrato vigente
                // no se toca nada.
                if (!$user->contratos()->where('completado', true)->exists()) {
                    $resumen['sin_contrato'][] = $cedula;
                    continue;
                }

                $actualizadosFila = [];
                $omitidosFila = [];
                // Celdas con un valor que no se pudo aceptar (fecha imposible, sede que no
                // existe, etc.): se omiten y se reportan, para que quien importa sepa qué
                // corregir en vez de que el dato desaparezca en silencio.
                $invalidosFila = [];

                foreach ($camposPermitidos as $campo) {
                    if (!array_key_exists($campo, $fila)) continue;
                    $valor = $fila[$campo];
                    $valor = is_string($valor) ? trim($valor) : $valor;
                    if ($valor === null || $valor === '') continue;

                    $valor = $this->valorImportable($campo, $valor, $camposFecha, $longitudesMaximas);
                    if ($valor === null) {
                        $invalidosFila[] = $campo;
                        continue;
                    }

                    if (!$this->campoSinDato($campo, $user->{$campo})) {
                        $omitidosFila[] = $campo;
                        continue;
                    }

                    $user->{$campo} = $valor;
                    $actualizadosFila[] = $campo;
                }

                // Esta cédula vino de un alta automática (p. ej. import de Contratos, que
                // crea un User "cascarón" para poder enlazar el contrato) y nunca se
                // completó su alta real en este módulo — por eso no aparecía en la lista de
                // Empleados aunque sus datos sí existieran. El import también la completa
                // aquí, con la misma lógica que store() al editar manualmente: no tiene
                // sentido rellenarle los datos y dejarlo igual de invisible.
                $seDioDeAlta = false;
                $credenciales = null;
                // El celular es obligatorio para dar de alta (también lo es en AvanzaConoce,
                // donde se crea su usuario): sin él se guardan los datos pero sigue pendiente.
                if ($user->pendiente_alta && trim((string) $user->movil) === '') {
                    $resumen['sin_celular'][] = $cedula;
                } elseif ($user->pendiente_alta) {
                    // Mismo rol por defecto que store(): 'consultor' ya no existe en el ENUM
                    // de `users.rol` y MySQL estricto tumbaría todo el lote.
                    $user->rol            = $user->rol ?: 'general';
                    $user->activo         = true;
                    $user->pendiente_alta = false;
                    // Misma contraseña que en AvanzaConoce si ya existe allá; si no, una temporal.
                    $nuevas = CredencialesAvanzaConoce::paraAlta($user->cedula);
                    $user->password = $nuevas['hash'];
                    $credenciales = ['email' => $user->email, 'password' => $nuevas['mostrar'], 'de_avanza' => $nuevas['de_avanza']];
                    $altas[] = [count($resumen['detalle']), $user, $nuevas];
                    $seDioDeAlta = true;
                }

                $huboDatosNuevos = !empty($actualizadosFila);

                if ($huboDatosNuevos || $seDioDeAlta) {
                    // `name` no se deriva solo al guardar (a diferencia de `rol`, que sí
                    // tiene un hook en User::booted() para `cargo`) — si se acaban de
                    // rellenar nombres/apellidos, se recalcula aquí para no dejarlo
                    // desincronizado con lo que se ve en el resto del sistema.
                    if (in_array('nombres', $actualizadosFila, true) || in_array('apellidos', $actualizadosFila, true)) {
                        $user->name = trim(($user->nombres ?? '') . ' ' . ($user->apellidos ?? ''));
                    }
                    $user->save();
                    if ($seDioDeAlta) {
                        app(\App\Services\EmpleadoSyncService::class)->syncFromUser($user);
                        $resumen['dados_de_alta']++;
                    }
                    if ($huboDatosNuevos) {
                        $resumen['actualizados']++;
                    }
                } else {
                    $resumen['sin_cambios']++;
                }

                $resumen['detalle'][] = [
                    'cedula'               => $cedula,
                    'nombre'               => trim(($user->nombres ?? '') . ' ' . ($user->apellidos ?? '')),
                    'campos_actualizados'  => $actualizadosFila,
                    'campos_omitidos'      => $omitidosFila,
                    'campos_invalidos'     => $invalidosFila,
                    'dado_de_alta'         => $seDioDeAlta,
                    'credenciales'         => $credenciales,
                ];
            }
        });

        $avanza = app(AltaEnAvanzaConoce::class);
        foreach ($altas as [$i, $user, $nuevas]) {
            $final = $avanza->sincronizar($user->fresh(), $nuevas);
            $resumen['detalle'][$i]['credenciales'] = [
                'email'     => $user->email,
                'password'  => $final['mostrar'],
                'de_avanza' => $final['de_avanza'],
                'avanza'    => $final['avanza'],
            ];
        }

        return response()->json($resumen);
    }

    /**
     * Valor de una celda del import ya validado y normalizado igual que lo deja el
     * formulario, o null si no es aceptable.
     */
    private function valorImportable(string $campo, mixed $valor, array $camposFecha, array $longitudesMaximas): mixed
    {
        if ($campo === 'tiene_cert_alturas') {
            return is_bool($valor) ? $valor : null;
        }
        if (!is_scalar($valor) || is_bool($valor)) {
            return null;
        }
        $valor = trim((string) $valor);
        if (isset($longitudesMaximas[$campo]) && mb_strlen($valor) > $longitudesMaximas[$campo]) {
            return null;
        }

        if (in_array($campo, $camposFecha, true)) {
            return ImportacionExcelValidador::fecha($valor, 1920, (int) date('Y') + 10);
        }

        switch ($campo) {
            case 'genero':
                $generos = [
                    'MASCULINO' => 'Masculino', 'M' => 'Masculino', 'FEMENINO' => 'Femenino', 'F' => 'Femenino',
                    'OTRO' => 'Otro', 'NO BINARIO' => 'No binario', 'PREFIERO NO DECIR' => 'Prefiero no decir',
                ];
                return $generos[mb_strtoupper($valor, 'UTF-8')] ?? null;
            case 'numero_hijos':
                return preg_match('/^\d{1,2}$/', $valor) && (int) $valor <= 20 ? (int) $valor : null;
            case 'jefe_inmediato_correo':
                return ImportacionExcelValidador::correo($valor);
            case 'sede':
                return ImportacionExcelValidador::sede($valor);
        }

        // Mismos campos que normalizarNombres() pone en mayúsculas al guardar desde el
        // formulario: sin esto, los filtros de la lista verían "Sura" y "SURA" como dos EPS.
        if (in_array($campo, ['nombres', 'apellidos', 'fondo_pensiones', 'arl', 'tipo_funcionario', 'eps', 'caja_compensacion'], true)) {
            return mb_strtoupper($valor, 'UTF-8');
        }

        return $valor;
    }

    /**
     * El campo del empleado no tiene un dato real: vacío, o con el valor de relleno que
     * deja el alta automática desde Contratos (ContratoController@store).
     */
    private function campoSinDato(string $campo, mixed $actual): bool
    {
        if ($actual === null || $actual === '') {
            return true;
        }

        return match ($campo) {
            'genero' => $actual === 'No especificado',
            'movil' => (bool) preg_match('/^0+$/', (string) $actual),
            'eps', 'arl' => mb_strtoupper(trim((string) $actual), 'UTF-8') === 'SIN ASIGNAR',
            default => false,
        };
    }

    public function destroy(User $empleado)
    {
        if ($empleado->id === Auth::id()) {
            return response()->json(['message' => 'No puedes eliminar tu propio usuario.'], 422);
        }

        // Se borra por completo: contratos, dotación, equipos asignados, documentos y su
        // proceso de selección (ver EliminacionEmpleado).
        $eliminado = \App\Services\EliminacionEmpleado::eliminar($empleado);

        return response()->json(['message' => 'Empleado eliminado por completo.', 'eliminado' => $eliminado]);
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
            $latestContrato = Contrato::select('created_at')
                ->whereColumn('empleado_id', 'users.id')
                ->where('completado', true)
                ->orderByDesc('created_at')
                ->limit(1);
            $query->orderByDesc($latestContrato)->limit(5);
        }

        return response()->json(
            $query->get()->map(function ($user) {
                $toDate = fn($v) => $v ? \Carbon\Carbon::parse($v)->format('Y-m-d') : null;
                // Primer valor real entre las fuentes, en orden de prioridad. Los rellenos con
                // que se crea el usuario desde Contratos ("0000000000", "Sin asignar", el
                // correo @avanzaconoce.com...) no cuentan como dato.
                $dato = fn (...$valores) => collect($valores)->first(fn ($v) => !self::esRelleno($v));

                // 1. Último contrato vigente
                $contrato = Contrato::where('empleado_id', $user->id)
                    ->where('completado', true)
                    ->latest()
                    ->first();

                // 2. Candidato vinculado por cédula: si la cédula pasó por varias
                //    requisiciones, el del aval vigente (el más reciente), no el más antiguo.
                $candidato = $user->cedula
                    ? \App\Models\Candidato::with(['empleador', 'requisicion.empresa', 'requisicion.empleador', 'requisicion.proyecto', 'requisicion.cargo'])
                        ->where('identificacion', $user->cedula)
                        ->orderByDesc('aval')->latest()->orderByDesc('id')
                        ->first()
                    : null;

                // 3. Base de ingresos del candidato
                $ingreso = $candidato
                    ? \App\Models\BaseIngreso::where('candidato_id', $candidato->id)->latest()->first()
                    : null;

                // 4. Respuesta de ingreso (formulario personal del empleado)
                $respuesta = $user->cedula
                    ? \App\Models\RespuestaIngreso::where('documento', $user->cedula)->latest()->first()
                    : null;

                $req = $candidato?->requisicion;

                return [
                    // ── Identificación
                    'user_id'          => $user->id,
                    'cedula'           => $user->cedula,
                    // Foto del usuario; si no tiene (o el archivo ya no existe), la del
                    // formulario de ingreso o la del candidato.
                    'fotografia'       => User::fotoExiste($user->fotografia)
                        ? $user->fotografia
                        : ($respuesta?->fotografia ?: $candidato?->fotografia ?: null),
                    'nombres'          => $dato($user->nombres, $respuesta?->nombres, $user->name),
                    'apellidos'        => $dato($user->apellidos, $respuesta?->apellidos) ?? '',
                    // El correo real que no use ya otro empleado (users.email es único). Si
                    // solo existe el técnico {cédula}@avanzaconoce.com, el campo queda vacío
                    // para escribir el real al dar el alta.
                    'email'            => collect([$user->email, $respuesta?->correo, $candidato?->correo, $ingreso?->correo])
                        ->first(fn ($c) => !self::esRelleno($c)
                            && !User::where('email', $c)->where('id', '!=', $user->id)->exists()),
                    'movil'            => $dato($user->movil, $respuesta?->celular, $candidato?->celular, $ingreso?->telefono),
                    'genero'           => $dato($user->genero, $candidato?->genero),
                    'fecha_expedicion' => $toDate($dato($user->fecha_expedicion, $candidato?->fecha_expedicion)),

                    // ── Datos personales (formulario de ingreso > user)
                    'fecha_nacimiento'     => $toDate($dato($respuesta?->fecha_nacimiento, $user->fecha_nacimiento)),
                    'lugar_nacimiento'     => $dato($respuesta?->lugar_nacimiento, $user->lugar_nacimiento),
                    'estado_civil'         => $dato($respuesta?->estado_civil, $user->estado_civil),
                    'nivel_escolaridad'    => $dato($respuesta?->nivel_escolaridad, $user->nivel_escolaridad),
                    'profesion'            => $dato($respuesta?->profesion, $user->profesion),
                    'direccion_residencia' => $dato($respuesta?->direccion, $user->direccion_residencia),
                    'estrato'              => $dato($respuesta?->estrato, $user->estrato),
                    'barrio'               => $dato($respuesta?->barrio, $user->barrio),
                    'numero_hijos'         => $dato($respuesta?->numero_hijos, $user->numero_hijos),
                    'rh'                   => $dato($respuesta?->rh, $user->rh),
                    'raza'                 => $dato($user->raza),
                    'talla_camisa'         => $dato($user->talla_camisa, $respuesta?->talla_camisa),
                    'talla_pantalon'       => $dato($user->talla_pantalon, $respuesta?->talla_pantalon),
                    'talla_zapatos'        => $dato($user->talla_zapatos, $respuesta?->talla_zapatos),

                    // ── Seguridad social (contrato > formulario de ingreso > candidato > user)
                    'eps'              => $dato($contrato?->lps_afiliado, $respuesta?->eps, $user->eps),
                    'arl'              => $dato($contrato?->arl, $candidato?->arl, $user->arl),
                    'fondo_pensiones'  => $dato($contrato?->fondo_pensiones, $respuesta?->afp, $user->fondo_pensiones),
                    'caja_compensacion'=> $dato($contrato?->caja_compensacion, $candidato?->caja_compensacion, $user->caja_compensacion),

                    // ── Datos laborales (contrato > aval > requisición > user)
                    'cargo'            => $dato($contrato?->cargo, $ingreso?->cargo, $req?->cargo?->nombre, $user->cargo),
                    'sede'             => $dato($contrato?->sede, $ingreso?->lugar_trabajo, $candidato?->lugar_trabajo, $user->sede),
                    'tipo_vinculacion' => $dato($contrato?->tipo_vinculacion, $ingreso?->tipo_vinculacion, $candidato?->tipo_vinculacion, $user->tipo_vinculacion),
                    'tipo_funcionario' => $dato($user->tipo_funcionario),
                    'empleador'        => $dato($contrato?->empleador, $ingreso?->empleador, $candidato?->empleadorNombre(), $user->empleador),
                    'jefe_inmediato'   => $dato($contrato?->jefe_inmediato, $ingreso?->lider_inmediato, $req?->responsable, $user->jefe_inmediato),
                    'empresa_id'       => $user->empresa_id           ?? $req?->empresa_id,
                    // Proyecto del contrato: Empleados muestra "Código Directv" solo en DIRECTV.
                    'cliente_proyecto' => $dato($contrato?->cliente_proyecto, $req?->proyecto?->nombre),
                    'empresa_nombre'   => $dato($contrato?->empresa, $user->empresa?->nombre, $ingreso?->empresa, $req?->empresa?->nombre),
                    'ingresos'         => $dato($contrato?->salario, $ingreso?->salario_basico, $candidato?->salario_basico, $user->ingresos),

                    // ── Contacto de emergencia (formulario de ingreso > user)
                    'contacto_emergencia_nombre'      => $dato($respuesta?->emergencia_nombre, $user->contacto_emergencia_nombre),
                    'contacto_emergencia_telefono'    => $dato($respuesta?->emergencia_telefono, $user->contacto_emergencia_telefono),
                    'contacto_emergencia_parentesco'  => $dato($respuesta?->emergencia_parentesco, $user->contacto_emergencia_parentesco),
                ];
            })
        );
    }


    /**
     * Valores de relleno con que Contratos crea al usuario "pendiente de alta" cuando aún no
     * hay datos reales (ver ContratoController::crearContratoYEmpleado). No son datos del
     * empleado: el autocompletado los salta para usar el formulario de ingreso o el candidato.
     */
    private const RELLENOS = ['0000000000', 'NO ESPECIFICADO', 'SIN ASIGNAR', 'INDEFINIDO', 'PRINCIPAL'];

    public static function esRelleno(mixed $valor): bool
    {
        if ($valor === null || $valor === '') {
            return true;
        }
        if (!is_string($valor)) {
            return false;
        }
        $v = mb_strtoupper(trim($valor), 'UTF-8');

        return $v === '' || in_array($v, self::RELLENOS, true) || str_ends_with($v, '@AVANZACONOCE.COM');
    }

    private function normalizarNombres(array &$data): void
    {
        $campos = ['nombres', 'apellidos'];
        foreach ($campos as $campo) {
            if (isset($data[$campo])) {
                $data[$campo] = mb_strtoupper($data[$campo], 'UTF-8');
            }
        }
    }

    /**
     * Roles que quien edita puede asignar. Solo un admin da (o quita) el rol de administrador;
     * TH/TIC tampoco pueden cambiarle el rol a un admin existente.
     */
    private function rolesAsignables(?User $empleado): array
    {
        $roles = \App\Models\PermisoDenegado::ROLES_GESTIONABLES;
        if (Auth::user()?->rol === 'admin' || $empleado?->rol === 'admin') {
            $roles[] = 'admin';
        }

        return $roles;
    }

    private function rules(?int $ignoreId = null, ?User $empleado = null): array
    {
        // Los datos de contratación (salario, cargo, sede, empresa, vinculación, seguridad
        // social y datos bancarios) no se reciben aquí: viven en Contratos y se copian al empleado desde allá
        // (EmpleadoSyncService::CAMPOS_CONTRATO).
        return [
            // Obligatorios
            'cedula'           => ['required', 'string', 'max:20', Rule::unique('users', 'cedula')->ignore($ignoreId)],
            'apellidos'        => 'required|string|max:150',
            'nombres'          => 'required|string|max:150',
            'genero'           => 'required|string|max:50',
            'movil'            => 'required|string|max:20',
            'email'            => ['required', 'email', Rule::unique('users', 'email')->ignore($ignoreId)],
            'estado_empleado'  => 'required|string|max:50',
            // "Tipo de funcionario" en pantalla: es el rol del usuario en el ERP.
            'rol'              => ['required', Rule::in($this->rolesAsignables($empleado))],

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
            'observaciones_medicas'=> 'nullable|string',
            'alergias'             => 'nullable|string',
            'talla_camisa'         => 'nullable|string|max:20',
            'talla_pantalon'       => 'nullable|string|max:20',
            'talla_zapatos'        => 'nullable|string|max:20',
            'rh'                   => 'nullable|string|max:5',
            'licencia_carro'       => 'nullable|string|max:20',
            'licencia_carro_vence' => 'nullable|date',
            'licencia_moto'        => 'nullable|string|max:20',
            'licencia_moto_vence'  => 'nullable|date',
            'tiene_cert_alturas'   => 'nullable|boolean',
            'cert_alturas_vence'   => 'nullable|date',
            'codigo_directv'       => 'nullable|string|max:30',
            'comentarios'          => 'nullable|string',
            'contacto_emergencia_nombre'     => 'nullable|string|max:150',
            'contacto_emergencia_telefono'   => 'nullable|string|max:20',
            'contacto_emergencia_parentesco' => 'nullable|string|max:80',
        ];
    }
}
