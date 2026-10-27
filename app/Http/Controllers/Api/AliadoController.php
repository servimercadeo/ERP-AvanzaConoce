<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Aliado;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\CredencialesAvanzaConoce;
use App\Services\IdentidadUnica;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Inventarios > Aliados: aliados (subagentes) de Work Orders y sus técnicos indirectos.
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

    public function index(Request $request)
    {
        $aliados = Aliado::withCount('tecnicos')
            ->when($request->tipo, fn ($q, $tipo) => $q->where('tipo', $tipo))
            ->when($request->search, function ($q, $s) {
                $q->where(fn ($w) => $w->where('nombre', 'like', "%{$s}%")
                    ->orWhere('documento', 'like', "%{$s}%")
                    ->orWhereHas('tecnicos', fn ($t) => $t->where('name', 'like', "%{$s}%")->orWhere('cedula', 'like', "%{$s}%")));
            })
            ->orderBy('nombre')
            ->get();

        $conteos = $this->conteosWorkOrders('users.aliado_id', $aliados->pluck('id')->all());
        $aliados->each(fn ($a) => $a->setAttribute('work_orders', $conteos[$a->id] ?? $this->conteoVacio()));

        return response()->json($aliados);
    }

    public function show(Aliado $aliado)
    {
        $tecnicos = $aliado->tecnicos()
            ->select('id', 'cedula', 'nombres', 'apellidos', 'name', 'email', 'movil', 'activo', 'aliado_id')
            ->orderBy('name')
            ->get();

        $conteos = $this->conteosWorkOrders('users.id', $tecnicos->pluck('id')->all());
        $tecnicos->each(fn ($t) => $t->setAttribute('work_orders', $conteos[$t->id] ?? $this->conteoVacio()));

        $aliado->setRelation('tecnicos', $tecnicos);
        $aliado->setAttribute('work_orders', $this->conteosWorkOrders('users.aliado_id', [$aliado->id])[$aliado->id] ?? $this->conteoVacio());

        return response()->json($aliado);
    }

    /** Work Orders de los técnicos del aliado; ?estado=atendidas|finalizadas filtra. */
    public function workOrders(Request $request, Aliado $aliado)
    {
        $cedulas = $aliado->tecnicos()->whereNotNull('cedula')->pluck('cedula');

        $query = WorkOrder::whereIn('cedula_tecnico', $cedulas)
            ->when($request->estado === 'atendidas', fn ($q) => $q->where('estado', self::ESTADO_ATENDIDA))
            ->when($request->estado === 'finalizadas', fn ($q) => $q->where('estado', self::ESTADO_FINALIZADA))
            ->when($request->cedula_tecnico, fn ($q, $c) => $q->where('cedula_tecnico', $c));

        return response()->json($query->orderByDesc('fecha_finalizacion')->orderByDesc('id')->limit(500)->get());
    }

    public function store(Request $request)
    {
        $tipo = $request->validate(['tipo' => ['required', Rule::in([Aliado::EMPRESA, Aliado::TECNICO])]])['tipo'];

        if ($tipo === Aliado::EMPRESA) {
            $data = $request->validate($this->reglasAliado());
            $aliado = Aliado::create($data + ['tipo' => Aliado::EMPRESA]);

            return response()->json(['aliado' => $aliado, 'credenciales' => null], 201);
        }

        // Tipo técnico: los datos de la persona sirven para el aliado y para su usuario técnico.
        $data = $request->validate($this->reglasTecnico() + [
            'ciudad'        => 'nullable|string|max:100',
            'direccion'     => 'nullable|string|max:255',
            'observaciones' => 'nullable|string|max:2000',
        ]);
        $request->validate(['cedula' => 'unique:aliados,documento'], [
            'cedula.unique' => 'Ya existe un aliado con ese documento.',
        ]);

        [$aliado, $credenciales] = DB::transaction(function () use ($data) {
            $aliado = Aliado::create([
                'tipo'           => Aliado::TECNICO,
                'tipo_documento' => 'CC',
                'documento'      => $data['cedula'],
                'nombre'         => $this->nombreCompleto($data),
                'telefono'       => $data['movil'],
                'correo'         => $data['email'] ?? null,
                'ciudad'         => $data['ciudad'] ?? null,
                'direccion'      => $data['direccion'] ?? null,
                'observaciones'  => $data['observaciones'] ?? null,
            ]);

            return [$aliado, $this->crearTecnico($aliado, $data)];
        });

        return response()->json(['aliado' => $aliado, 'credenciales' => $credenciales], 201);
    }

    public function update(Request $request, Aliado $aliado)
    {
        $reglas = $this->reglasAliado($aliado) + ['activo' => 'sometimes|boolean'];
        // El documento del aliado tipo técnico es la cédula de su usuario: no se cambia aquí.
        if ($aliado->tipo === Aliado::TECNICO) {
            unset($reglas['tipo_documento'], $reglas['documento']);
        }

        $aliado->update($request->validate($reglas));

        return response()->json($aliado->fresh());
    }

    public function destroy(Aliado $aliado)
    {
        if ($aliado->tecnicos()->exists()) {
            return response()->json([
                'message' => 'Este aliado tiene técnicos registrados: inactívalo en vez de eliminarlo, así se conserva su historial de Work Orders.',
            ], 422);
        }

        $aliado->delete();

        return response()->json(['message' => 'Aliado eliminado.']);
    }

    /** Agrega un técnico a un aliado tipo empresa. */
    public function agregarTecnico(Request $request, Aliado $aliado)
    {
        if ($aliado->tipo !== Aliado::EMPRESA) {
            return response()->json(['message' => 'Solo a un aliado empresa se le agregan técnicos: el aliado indirecto es una sola persona.'], 422);
        }

        $data = $request->validate($this->reglasTecnico());
        $credenciales = DB::transaction(fn () => $this->crearTecnico($aliado, $data));

        return response()->json(['credenciales' => $credenciales], 201);
    }

    public function actualizarTecnico(Request $request, Aliado $aliado, User $tecnico)
    {
        abort_unless($tecnico->aliado_id === $aliado->id, 404);

        $data = $request->validate([
            'nombres'   => 'required|string|max:100',
            'apellidos' => 'required|string|max:100',
            'movil'     => 'required|string|max:20',
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

        // Sin correo se usa el técnico "{cédula}@avanzaconoce.com", como en Contratos.
        $email = IdentidadUnica::normalizarCorreo($data['email'] ?? '') ?: "{$cedula}@avanzaconoce.com";
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

    private function reglasAliado(?Aliado $aliado = null): array
    {
        return [
            'tipo_documento'  => ['required', Rule::in(['NIT', 'CC'])],
            'documento'       => ['required', 'string', 'max:20', 'regex:/^[0-9][0-9\-]*$/', Rule::unique('aliados', 'documento')->ignore($aliado?->id)],
            'nombre'          => 'required|string|max:150',
            'contacto_nombre' => 'nullable|string|max:150',
            'telefono'        => 'nullable|string|max:20',
            'correo'          => 'nullable|email|max:150',
            'ciudad'          => 'nullable|string|max:100',
            'direccion'       => 'nullable|string|max:255',
            'observaciones'   => 'nullable|string|max:2000',
        ];
    }

    private function reglasTecnico(): array
    {
        return [
            'cedula'    => 'required|digits_between:5,15',
            'nombres'   => 'required|string|max:100',
            'apellidos' => 'required|string|max:100',
            'movil'     => 'required|string|max:20',
            'email'     => 'nullable|email|max:150',
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
