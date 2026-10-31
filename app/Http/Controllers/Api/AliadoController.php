<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Aliado;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\AltaAliadoEnAvanzaConoce;
use App\Services\AltaEnAvanzaConoce;
use App\Services\CredencialesAvanzaConoce;
use App\Services\UsuarioAliadoEmpresa;
use App\Services\IdentidadUnica;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Operaciones > Aliados: aliados (subagentes) de Work Orders y sus técnicos indirectos.
 *
 * - Aliado empresa (tipo "empresa", ej. Tecnotelevisión S.A.S): uno o más técnicos; solo se
 *   crea el aliado y sus técnicos se agregan después.
 * - Aliado indirecto (tipo "tecnico", ej. Pedro Pérez): una sola persona que no es empleado;
 *   se crea el aliado y, con los mismos datos, su usuario técnico.
 * No hay aliados directos: quien es directo es empleado (Contratos → Empleados).
 *
 * Los técnicos son usuarios del ERP (rol `tecnico`, `aliado_id`) que entran a ver sus Work
 * Orders. Las Work Orders se asocian por la cédula del técnico (`cedula_tecnico`).
 */
class AliadoController extends Controller
{
    /** Estado de la Work Order (columna "Estado" del export) que cuenta en cada contador. */
    private const ESTADO_ATENDIDA = 'Atendido';
    private const ESTADO_FINALIZADA = 'Finalizado';

    /** Teléfono / celular: números, con + inicial, espacios o guiones opcionales. */
    private const REGEX_TELEFONO = '/^\+?[0-9][0-9 \-]{6,19}$/';
    /** Nombres y apellidos: letras (con tildes y ñ), espacios, punto, guion y apóstrofo. */
    private const REGEX_NOMBRE = "/^[\pL\s.'\-]+$/u";

    /** Mensajes de validación en español (la app corre con locale "en" y sin traducciones). */
    private const MENSAJES = [
        'required'       => 'Completa el campo «:attribute».',
        'string'         => 'El campo «:attribute» no es válido.',
        'max'            => 'El campo «:attribute» admite máximo :max caracteres.',
        'email'          => 'El correo «:input» no es válido. Escríbelo completo, ej. nombre@empresa.com.',
        'in'             => 'Elige una opción válida en «:attribute».',
        'integer'        => 'Elige una opción válida en «:attribute».',
        'boolean'        => 'Elige una opción válida en «:attribute».',
        'digits_between' => 'El campo «:attribute» debe tener solo números, entre :min y :max dígitos.',
        'regex'          => 'El campo «:attribute» tiene un formato no válido.',
        'unique'         => 'Ya existe un registro con ese «:attribute».',

        'proyectos.required'   => 'Selecciona al menos un proyecto para el que trabaja el aliado (ej. DIRECTV o HUGHES COL).',
        'proyectos.array'      => 'Selecciona al menos un proyecto para el que trabaja el aliado (ej. DIRECTV o HUGHES COL).',
        'proyectos.min'        => 'Selecciona al menos un proyecto para el que trabaja el aliado (ej. DIRECTV o HUGHES COL).',
        'proyectos.*.in'       => 'Uno de los proyectos marcados ya no está disponible en Parámetros > Proyectos. Recarga la página y vuelve a marcarlos.',
        'proyectos.*.integer'  => 'Uno de los proyectos marcados no es válido. Recarga la página y vuelve a marcarlos.',
        'proyectos.*.distinct' => 'Hay un proyecto marcado dos veces.',

        'jefe_inmediato_id.required' => 'Selecciona el jefe inmediato del aliado.',
        'jefe_inmediato_id.integer'  => 'Selecciona el jefe inmediato del aliado.',
        'jefe_inmediato_id.in'       => 'El jefe inmediato debe ser un usuario activo del ERP que no sea técnico ni de rol general.',

        'tipo_documento.in'     => 'El tipo de documento debe ser Cédula de ciudadanía, Cédula de extranjería o NIT.',
        'documento.regex'       => 'El número de documento debe tener solo números, entre 5 y 15 dígitos (el NIT puede llevar el dígito de verificación, ej. 900123456-7).',
        'documento.unique'      => 'Ya existe un aliado con ese número de documento.',
        'cedula.digits_between' => 'La cédula debe tener solo números, entre 5 y 15 dígitos (sin puntos ni espacios).',
        'telefono.regex'        => 'El teléfono debe tener solo números, ej. 3001234567 o 6041234567.',
        'movil.regex'           => 'El celular debe tener solo números, ej. 3001234567.',
        'nombres.regex'         => 'Los nombres solo pueden tener letras y espacios.',
        'apellidos.regex'       => 'Los apellidos solo pueden tener letras y espacios.',
        'email.unique'          => 'Ese correo ya lo usa otro usuario del ERP.',
        'codigo_pdv.regex'      => 'El código punto de venta (PDV) debe tener solo números, ej. 39582.',
        'representante_legal_nombre.regex'    => 'El nombre del representante legal solo puede tener letras y espacios.',
        'representante_legal_documento.regex' => 'El documento del representante legal debe tener solo números, entre 5 y 15 dígitos (sin puntos ni espacios).',
        'modalidad_id_bt.required' => 'Selecciona la modalidad del aliado.',
        'modalidad_id_bt.integer'  => 'Selecciona la modalidad del aliado.',
        'modalidad_id_bt.in'       => 'La modalidad elegida no está en el catálogo de AvanzaConoce. Recarga la página y vuelve a elegirla.',
    ];

    /** Nombres de los campos como se ven en el formulario. */
    private const ATRIBUTOS = [
        'tipo'              => 'Tipo de aliado',
        'tipo_documento'    => 'Tipo de documento',
        'documento'         => 'Número de documento',
        'nombre'            => 'Razón social o nombre',
        'codigo_pdv'        => 'Código punto de venta (PDV)',
        'representante_legal_nombre'    => 'Nombre del representante legal',
        'representante_legal_documento' => 'Documento del representante legal',
        'modalidad_id_bt'   => 'Modalidad',
        'telefono'          => 'Teléfono',
        'correo'            => 'Correo',
        'ciudad'            => 'Ciudad',
        'direccion'         => 'Dirección',
        'observaciones'     => 'Observaciones',
        'proyectos'         => 'Proyecto(s)',
        'jefe_inmediato_id' => 'Jefe inmediato',
        'cedula'            => 'Cédula',
        'nombres'           => 'Nombres',
        'apellidos'         => 'Apellidos',
        'movil'             => 'Celular',
        'email'             => 'Correo',
        'activo'            => 'Estado',
    ];

    /** Proyectos de Parámetros que se le pueden asignar a un aliado (todos menos ADMINISTRATIVO). */
    public function proyectos()
    {
        return response()->json(Aliado::proyectosDisponibles());
    }

    /** Modalidades del aliado empresa (catálogo modalidades_bt de AvanzaConoce). */
    public function modalidades()
    {
        return response()->json(Aliado::modalidadesDisponibles()->values());
    }

    /** Usuarios que se pueden elegir como jefe inmediato (todos menos técnicos y rol general). */
    public function jefes()
    {
        return response()->json(Aliado::jefesDisponibles());
    }

    /**
     * Con ?page= responde por páginas de 10, con el resumen (aliados por tipo y técnicos)
     * de todos los que cumplen los filtros, no solo de la página. Sin ?page= devuelve la lista completa.
     */
    public function index(Request $request)
    {
        $query = Aliado::query()
            // El usuario de un aliado empresa solo se ve a sí mismo; el técnico indirecto, a su aliado.
            ->when($this->esAliado($request), fn ($q) => $q->where('usuario_id', $request->user()->id))
            ->when($this->tecnicoIndirecto($request), fn ($q, $tecnico) => $q->whereKey($tecnico->aliado_id))
            ->when($request->tipo, fn ($q, $tipo) => $q->where('tipo', $tipo))
            ->when($request->proyecto, fn ($q, $proyecto) => $q->whereHas('proyectos', fn ($p) => $p->where('proyectos.id', $proyecto)))
            ->when($request->search, function ($q, $s) {
                $q->where(fn ($w) => $w->where('nombre', 'like', "%{$s}%")
                    ->orWhere('documento', 'like', "%{$s}%")
                    ->orWhereHas('tecnicos', fn ($t) => $t->where('name', 'like', "%{$s}%")->orWhere('cedula', 'like', "%{$s}%")));
            });

        if (! $request->has('page')) {
            $aliados = (clone $query)->withCount('tecnicos')->with(['proyectos:id,nombre', 'jefeInmediato:id,name'])->orderBy('nombre')->get();
            $this->agregarConteos($aliados);

            return response()->json($aliados);
        }

        $resumen = [
            'aliados' => (clone $query)->count(),
            'empresa' => (clone $query)->where('tipo', Aliado::EMPRESA)->count(),
            'tecnico' => (clone $query)->where('tipo', Aliado::TECNICO)->count(),
            'tecnicos' => User::whereIn('aliado_id', (clone $query)->select('id'))->count(),
        ];

        $pagina = (clone $query)->withCount('tecnicos')->with(['proyectos:id,nombre', 'jefeInmediato:id,name'])->orderBy('nombre')->orderBy('id')->paginate(10);
        $this->agregarConteos($pagina->getCollection());

        return response()->json($pagina->toArray() + ['resumen' => $resumen]);
    }

    private function agregarConteos($aliados): void
    {
        $conteos = $this->conteosWorkOrders('users.aliado_id', $aliados->pluck('id')->all());
        $aliados->each(fn ($a) => $a->setAttribute('work_orders', $conteos[$a->id] ?? $this->conteoVacio()));
    }

    public function show(Request $request, Aliado $aliado)
    {
        $this->soloElSuyo($request, $aliado);
        // El técnico indirecto solo se ve a sí mismo (no a los demás técnicos de su aliado).
        $tecnicos = $this->tecnicosVisibles($request, $aliado)
            ->select('id', 'cedula', 'nombres', 'apellidos', 'name', 'email', 'movil', 'activo', 'aliado_id')
            ->orderBy('name')
            ->get();

        $conteos = $this->conteosWorkOrders('users.id', $tecnicos->pluck('id')->all());
        $tecnicos->each(fn ($t) => $t->setAttribute('work_orders', $conteos[$t->id] ?? $this->conteoVacio()));

        $aliado->setRelation('tecnicos', $tecnicos);
        $aliado->load(['proyectos:id,nombre', 'jefeInmediato:id,name']);
        $aliado->setAttribute('work_orders', $this->tecnicoIndirecto($request)
            ? ($conteos[$request->user()->id] ?? $this->conteoVacio())
            : ($this->conteosWorkOrders('users.aliado_id', [$aliado->id])[$aliado->id] ?? $this->conteoVacio()));

        return response()->json($aliado);
    }

    /**
     * Work Orders de los técnicos del aliado (por Cédula Técnico), de 25 en 25 con ?page=.
     * Filtros: ?estado=atendidas|finalizadas, ?cedula_tecnico= y ?search= (N° de WO o ítem).
     * Sin ?page= devuelve las 500 más recientes (compatibilidad).
     */
    public function workOrders(Request $request, Aliado $aliado)
    {
        $this->soloElSuyo($request, $aliado);
        $cedulas = $this->tecnicosVisibles($request, $aliado)->whereNotNull('cedula')->pluck('cedula');

        $query = WorkOrder::whereIn('cedula_tecnico', $cedulas)
            ->when($request->estado === 'atendidas', fn ($q) => $q->where('estado', self::ESTADO_ATENDIDA))
            ->when($request->estado === 'finalizadas', fn ($q) => $q->where('estado', self::ESTADO_FINALIZADA))
            ->when($request->cedula_tecnico, fn ($q, $c) => $q->where('cedula_tecnico', $c))
            ->when(trim((string) $request->search), fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('numero_wo', 'like', "%{$s}%")->orWhere('numero_wo_ibs', 'like', "%{$s}%")))
            ->orderByDesc('fecha_finalizacion')->orderByDesc('id');

        if ($request->has('page')) {
            return response()->json($query->paginate(25, [
                'id', 'numero_wo', 'numero_item', 'estado', 'nombre_tecnico', 'cedula_tecnico', 'servicio', 'municipio',
                'fecha_estado', 'fecha_finalizacion',
            ]));
        }

        return response()->json($query->limit(500)->get());
    }

    public function store(Request $request)
    {
        // Un aliado o técnico de aliado nunca crea aliados nuevos, aunque la matriz le dé "Crear"
        // (ese "Crear", en su ficha, es agregar técnicos a su empresa).
        abort_if($this->esAliado($request) || $this->tecnicoIndirecto($request), 403, 'No tienes permiso para crear aliados.');
        $tipo = $this->validar($request, ['tipo' => ['required', Rule::in([Aliado::EMPRESA, Aliado::TECNICO])]])['tipo'];

        if ($tipo === Aliado::EMPRESA) {
            $data = $this->validar($request, $this->reglasAliado());
            $aliado = DB::transaction(function () use ($data) {
                $aliado = Aliado::create($data + ['tipo' => Aliado::EMPRESA]);
                $aliado->proyectos()->sync($data['proyectos']);
                return $aliado;
            });

            // Ya guardado en el ERP: su usuario en AvanzaConoce (rol Aliado, con PDV, modalidad
            // y su líder como supervisor). Si allá falla, el aliado queda creado igual.
            $credenciales = app(AltaAliadoEnAvanzaConoce::class)->sincronizar($aliado);
            // Y su usuario del ERP, con la misma contraseña.
            $credenciales = $this->conUsuarioDelErp($aliado->fresh(), $credenciales);

            return response()->json(['aliado' => $aliado->fresh()->load(['proyectos:id,nombre', 'jefeInmediato:id,name']), 'credenciales' => $credenciales], 201);
        }

        // Tipo técnico: los datos de la persona sirven para el aliado y para su usuario técnico.
        // Su documento puede ser CC, CE o NIT; el NIT de una persona natural es su cédula más
        // el dígito de verificación ("1234567-8"), así que su usuario queda con la cédula.
        $data = $this->validar($request, array_merge($this->reglasTecnico(), [
            'tipo_documento' => ['required', Rule::in(Aliado::TIPOS_DOCUMENTO)],
            'cedula'         => ['required', 'regex:/^[0-9]{5,15}(-[0-9])?$/', 'unique:aliados,documento'],
            'ciudad'         => 'required|string|max:100',
            'direccion'      => 'required|string|max:255',
            'observaciones'  => 'nullable|string|max:2000',
        ], $this->reglasProyectos(), $this->reglasJefe()), ['cedula' => 'Número de documento'], [
            'cedula.regex'  => 'El número de documento debe tener solo números, entre 5 y 15 dígitos (el NIT puede llevar el dígito de verificación, ej. 1234567-8).',
            'cedula.unique' => 'Ya existe un aliado con ese número de documento.',
        ]);
        if ($data['tipo_documento'] !== 'NIT' && str_contains($data['cedula'], '-')) {
            throw ValidationException::withMessages(['cedula' => 'La cédula debe tener solo números: el guion con dígito de verificación solo aplica al NIT.']);
        }
        $documento = $data['cedula'];
        $data['cedula'] = explode('-', $documento)[0];

        [$aliado, $tecnico, $credenciales] = DB::transaction(function () use ($data, $documento) {
            $aliado = Aliado::create([
                'tipo'           => Aliado::TECNICO,
                'tipo_documento' => $data['tipo_documento'],
                'documento'      => $documento,
                'nombre'         => $this->nombreCompleto($data),
                'telefono'       => $data['movil'],
                'correo'         => $data['email'],
                'ciudad'         => $data['ciudad'],
                'direccion'      => $data['direccion'],
                'observaciones'  => $data['observaciones'] ?? null,
                'jefe_inmediato_id' => $data['jefe_inmediato_id'],
            ]);
            $aliado->proyectos()->sync($data['proyectos']);

            return [$aliado, ...$this->crearTecnico($aliado, $data)];
        });

        // Ya guardado en el ERP: también se crea su usuario en AvanzaConoce, con la misma
        // contraseña y el mismo rol del técnico directo. Si AvanzaConoce falla, el aliado
        // queda creado igual y el alta allá se reintenta sola (avanza:sincronizar-usuarios).
        $credenciales = app(AltaEnAvanzaConoce::class)->sincronizar($tecnico->fresh(), $credenciales);
        $credenciales = $this->credencialesParaMostrar($tecnico, $credenciales) + ['avanza' => $credenciales['avanza']];

        return response()->json(['aliado' => $aliado->load(['proyectos:id,nombre', 'jefeInmediato:id,name']), 'credenciales' => $credenciales], 201);
    }

    public function update(Request $request, Aliado $aliado)
    {
        $this->soloElSuyo($request, $aliado);
        $reglas = $this->reglasAliado($aliado) + ['activo' => 'sometimes|boolean'];
        // El documento del aliado tipo técnico es la cédula de su usuario: no se cambia aquí.
        if ($aliado->tipo === Aliado::TECNICO) {
            unset($reglas['tipo_documento'], $reglas['documento'], $reglas['codigo_pdv'], $reglas['modalidad_id_bt'],
                $reglas['representante_legal_nombre'], $reglas['representante_legal_documento']);
        }

        $data = $this->validar($request, $reglas);
        DB::transaction(function () use ($aliado, $data) {
            $aliado->update($data);
            $aliado->proyectos()->sync($data['proyectos']);
        });

        // Su usuario del ERP sigue al aliado (nombre, correo, teléfono, activo). Si no se le
        // pudo crear (documento o correo de otra persona), se reintenta con los datos nuevos.
        if ($aliado->tipo === Aliado::EMPRESA) {
            $aliado->usuario_id
                ? app(UsuarioAliadoEmpresa::class)->sincronizar($aliado)
                : app(UsuarioAliadoEmpresa::class)->asegurar($aliado);
        }

        // AvanzaConoce rechazó un dato (correo o teléfono de otra persona...): al corregirlo
        // aquí vuelve a quedar pendiente y el reintento lo crea.
        if ($aliado->avanza_sync_estado === AltaEnAvanzaConoce::CONFLICTO && $aliado->wasChanged(['correo', 'telefono', 'documento', 'nombre'])) {
            $aliado->forceFill(['avanza_sync_estado' => AltaEnAvanzaConoce::PENDIENTE])->saveQuietly();
        }

        return response()->json($aliado->fresh()->load(['proyectos:id,nombre', 'jefeInmediato:id,name']));
    }

    public function destroy(Request $request, Aliado $aliado)
    {
        $this->soloElSuyo($request, $aliado);
        if ($aliado->tecnicos()->exists()) {
            return response()->json([
                'message' => 'Este aliado tiene técnicos registrados: inactívalo en vez de eliminarlo, así se conserva su historial de Work Orders.',
            ], 422);
        }

        DB::transaction(function () use ($aliado) {
            $usuarioId = $aliado->usuario_id;
            $aliado->delete();
            // Su usuario del ERP solo existía para él.
            User::where('id', $usuarioId)->where('rol', UsuarioAliadoEmpresa::ROL)->delete();
        });

        return response()->json(['message' => 'Aliado eliminado.']);
    }

    /** Agrega un técnico a un aliado tipo empresa. */
    public function agregarTecnico(Request $request, Aliado $aliado)
    {
        $this->soloElSuyo($request, $aliado);
        if ($aliado->tipo !== Aliado::EMPRESA) {
            return response()->json(['message' => 'Solo a un aliado empresa se le agregan técnicos: el aliado indirecto es una sola persona.'], 422);
        }

        $data = $this->validar($request, $this->reglasTecnico());
        [$tecnico, $credenciales] = DB::transaction(fn () => $this->crearTecnico($aliado, $data));
        $credenciales = $this->credencialesParaMostrar($tecnico, $credenciales);

        return response()->json(['credenciales' => $credenciales], 201);
    }

    public function actualizarTecnico(Request $request, Aliado $aliado, User $tecnico)
    {
        $this->soloElSuyo($request, $aliado);
        abort_unless($tecnico->aliado_id === $aliado->id, 404);
        // El técnico de un aliado (directo de la empresa o indirecto) solo se edita a sí mismo.
        abort_if(($yo = $this->tecnicoIndirecto($request)) && $yo->id !== $tecnico->id, 404);

        $data = $this->validar($request, [
            'nombres'   => ['required', 'string', 'max:100', 'regex:' . self::REGEX_NOMBRE],
            'apellidos' => ['required', 'string', 'max:100', 'regex:' . self::REGEX_NOMBRE],
            'movil'     => ['required', 'string', 'max:20', 'regex:' . self::REGEX_TELEFONO],
            'email'     => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($tecnico->id)],
            'activo'    => 'sometimes|boolean',
        ]);
        $data['email'] = IdentidadUnica::normalizarCorreo($data['email']);
        $this->validarIdentidad($data['email'], $data['movil'], $tecnico->cedula, $tecnico->id);

        $tecnico->update([
            'nombres'   => mb_strtoupper(trim($data['nombres']), 'UTF-8'),
            'apellidos' => mb_strtoupper(trim($data['apellidos']), 'UTF-8'),
            'name'      => $this->nombreCompleto($data),
            'movil'     => trim($data['movil']),
            'email'     => $data['email'],
        ] + (array_key_exists('activo', $data) ? ['activo' => $data['activo']] : []));

        return response()->json($tecnico->fresh());
    }

    /** @return array{0: User, 1: array} el técnico y sus credenciales (CredencialesAvanzaConoce::paraAlta). */
    private function crearTecnico(Aliado $aliado, array $data): array
    {
        $cedula = trim($data['cedula']);

        // Nunca se reutiliza un usuario existente en silencio: un empleado directo no debe
        // quedar como técnico de un aliado por un error de digitación.
        if ($existente = User::where('cedula', $cedula)->first()) {
            throw ValidationException::withMessages(['cedula' => $existente->aliado_id
                ? "La cédula {$cedula} ya es técnico de otro aliado."
                : "La cédula {$cedula} ya existe en el ERP (empleado o usuario). Los técnicos directos se gestionan en Empleados."]);
        }

        $email = IdentidadUnica::normalizarCorreo($data['email']);
        if (User::where('email', $email)->exists()) {
            throw ValidationException::withMessages(['email' => "El correo {$email} ya está registrado en el ERP."]);
        }
        $this->validarIdentidad($email, $data['movil'], $cedula);

        // Misma contraseña que en AvanzaConoce si ya existe allá; si no, una temporal.
        $credenciales = CredencialesAvanzaConoce::paraAlta($cedula);

        $tecnico = new User([
            'cedula'           => $cedula,
            'nombres'          => mb_strtoupper(trim($data['nombres']), 'UTF-8'),
            'apellidos'        => mb_strtoupper(trim($data['apellidos']), 'UTF-8'),
            'name'             => $this->nombreCompleto($data),
            'email'            => $email,
            'movil'            => trim($data['movil']),
            'password'         => $credenciales['hash'],
            'activo'           => true,
            'pendiente_alta'   => false,
            'estado_empleado'  => 'Activo',
            'tipo_vinculacion' => 'Indirecto',
        ]);
        $tecnico->forceFill(['rol' => 'tecnico', 'aliado_id' => $aliado->id])->save();

        return [$tecnico, $credenciales];
    }

    /**
     * Crea el usuario del ERP del aliado empresa (misma contraseña que en AvanzaConoce) y
     * completa las credenciales a mostrar. Con la integración apagada (`$credenciales` null)
     * se muestran las del ERP solo.
     */
    private function conUsuarioDelErp(Aliado $aliado, ?array $credenciales): array
    {
        // Si ya existía en AvanzaConoce, su contraseña es la de allá, no la generada aquí.
        $hash = ($credenciales['de_avanza'] ?? false)
            ? (CredencialesAvanzaConoce::passwordEnAvanza(AltaAliadoEnAvanzaConoce::nit($aliado)) ?? $aliado->avanza_password)
            : $aliado->avanza_password;
        $erp = app(UsuarioAliadoEmpresa::class)->asegurar($aliado, $hash);

        $credenciales ??= [
            'nombre'    => $aliado->nombre,
            'email'     => mb_strtolower(trim((string) $aliado->correo)),
            'password'  => $erp['password'],
            'de_avanza' => false,
        ];

        return array_merge($credenciales, [
            'solo_avanza' => false,
            'erp'         => ['estado' => $erp['estado'], 'mensaje' => $erp['mensaje']],
        ]);
    }

    private function esAliado(Request $request): bool
    {
        return $request->user()?->rol === UsuarioAliadoEmpresa::ROL;
    }

    /** El técnico indirecto (técnico con `aliado_id`) en sesión, si lo es. */
    private function tecnicoIndirecto(Request $request): ?User
    {
        $user = $request->user();
        return $user && !$this->esAliado($request) && $user->aliado_id ? $user : null;
    }

    /** El usuario de un aliado empresa y el técnico indirecto solo abren su propio aliado. */
    private function soloElSuyo(Request $request, Aliado $aliado): void
    {
        abort_if($this->esAliado($request) && $aliado->usuario_id !== $request->user()->id, 404);
        abort_if(($tecnico = $this->tecnicoIndirecto($request)) && $aliado->id !== $tecnico->aliado_id, 404);
    }

    /** Técnicos del aliado que este usuario ve: todos, o solo él si es un técnico indirecto. */
    private function tecnicosVisibles(Request $request, Aliado $aliado)
    {
        return $aliado->tecnicos()->when($this->tecnicoIndirecto($request), fn ($q, $tecnico) => $q->whereKey($tecnico->id));
    }

    private function credencialesParaMostrar(User $tecnico, array $credenciales): array
    {
        return [
            'nombre'    => $tecnico->name,
            'email'     => $tecnico->email,
            'password'  => $credenciales['mostrar'],
            'de_avanza' => $credenciales['de_avanza'],
        ];
    }

    private function validarIdentidad(string $email, string $movil, string $cedula, ?int $exceptoUserId = null): void
    {
        if ($msg = IdentidadUnica::correoDeOtraPersona($email, $cedula, $exceptoUserId)) {
            throw ValidationException::withMessages(['email' => $msg]);
        }
        if ($msg = IdentidadUnica::telefonoDeOtraPersona($movil, $cedula, $exceptoUserId)) {
            throw ValidationException::withMessages(['movil' => $msg]);
        }
    }

    /** Valida con los mensajes y nombres de campo en español. */
    private function validar(Request $request, array $reglas, array $atributos = [], array $mensajes = []): array
    {
        return $request->validate($reglas, $mensajes + self::MENSAJES, $atributos + self::ATRIBUTOS);
    }

    /** Todos obligatorios menos Observaciones. */
    private function reglasAliado(?Aliado $aliado = null): array
    {
        return [
            'tipo_documento'  => ['required', Rule::in(Aliado::TIPOS_DOCUMENTO)],
            'documento'       => ['required', 'string', 'max:20', 'regex:/^[0-9]{5,15}(-[0-9])?$/', Rule::unique('aliados', 'documento')->ignore($aliado?->id)],
            'nombre'          => 'required|string|max:150',
            'representante_legal_nombre'    => ['required', 'string', 'max:150', 'regex:' . self::REGEX_NOMBRE],
            'representante_legal_documento' => ['required', 'string', 'regex:/^[0-9]{5,15}$/'],
            'codigo_pdv'      => ['required', 'string', 'regex:/^[0-9]{1,20}$/'],
            'modalidad_id_bt' => ['required', 'integer', Rule::in(Aliado::modalidadesDisponibles()->pluck('id_bt')->all())],
            'telefono'        => ['required', 'string', 'max:20', 'regex:' . self::REGEX_TELEFONO],
            'correo'          => 'required|email|max:150',
            'ciudad'          => 'required|string|max:100',
            'direccion'       => 'required|string|max:255',
            'observaciones'   => 'nullable|string|max:2000',
        ] + $this->reglasProyectos() + $this->reglasJefe();
    }

    /** Jefe inmediato: obligatorio, uno de los usuarios que ofrece jefes(). */
    private function reglasJefe(): array
    {
        return [
            'jefe_inmediato_id' => ['required', 'integer', Rule::in(Aliado::jefesDisponibles()->pluck('id')->all())],
        ];
    }

    /** Proyectos (ids de Parámetros) para los que trabaja el aliado: al menos uno, puede ser varios. */
    private function reglasProyectos(): array
    {
        return [
            'proyectos'   => 'required|array|min:1',
            'proyectos.*' => ['integer', 'distinct', Rule::in(Aliado::proyectosDisponibles()->pluck('id')->all())],
        ];
    }

    private function reglasTecnico(): array
    {
        return [
            'cedula'    => 'required|digits_between:5,15',
            'nombres'   => ['required', 'string', 'max:100', 'regex:' . self::REGEX_NOMBRE],
            'apellidos' => ['required', 'string', 'max:100', 'regex:' . self::REGEX_NOMBRE],
            'movil'     => ['required', 'string', 'max:20', 'regex:' . self::REGEX_TELEFONO],
            'email'     => 'required|email|max:150',
        ];
    }

    private function nombreCompleto(array $data): string
    {
        return mb_strtoupper(trim(trim($data['nombres']) . ' ' . trim($data['apellidos'])), 'UTF-8');
    }

    /**
     * Work Orders por $columna (users.aliado_id o users.id), contando cada WO una vez
     * aunque traiga varias filas (una por ítem). Asignadas = todas las de sus técnicos.
     *
     * @return array<int, array{asignadas: int, atendidas: int, finalizadas: int}>
     */
    private function conteosWorkOrders(string $columna, array $ids): array
    {
        if (!$ids) {
            return [];
        }

        $prefijo = DB::getTablePrefix();
        $wo = "{$prefijo}work_orders";

        return DB::table('work_orders')
            ->join('users', 'users.cedula', '=', 'work_orders.cedula_tecnico')
            ->whereIn($columna, $ids)
            ->groupBy($columna)
            ->selectRaw("{$prefijo}{$columna} as llave")
            ->selectRaw("COUNT(DISTINCT {$wo}.numero_wo) as asignadas")
            ->selectRaw("COUNT(DISTINCT CASE WHEN {$wo}.estado = ? THEN {$wo}.numero_wo END) as atendidas", [self::ESTADO_ATENDIDA])
            ->selectRaw("COUNT(DISTINCT CASE WHEN {$wo}.estado = ? THEN {$wo}.numero_wo END) as finalizadas", [self::ESTADO_FINALIZADA])
            ->get()
            ->mapWithKeys(fn ($f) => [(int) $f->llave => [
                'asignadas'   => (int) $f->asignadas,
                'atendidas'   => (int) $f->atendidas,
                'finalizadas' => (int) $f->finalizadas,
            ]])
            ->all();
    }

    private function conteoVacio(): array
    {
        return ['asignadas' => 0, 'atendidas' => 0, 'finalizadas' => 0];
    }
}
