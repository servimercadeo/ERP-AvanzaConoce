<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EmpleadoController extends Controller
{
    public function index()
    {
        return response()->json(
            User::with(['empresa', 'contratos' => function($q) {
                $q->orderBy('fecha_ingreso', 'desc');
            }])
                ->whereNotNull('cedula')
                ->where('cedula', '!=', '')
                ->orderByRaw('apellidos IS NULL ASC, apellidos ASC')
                ->orderByRaw('nombres IS NULL ASC, nombres ASC')
                ->get()
                ->map(function($user) {
                    // 1. Buscar en respuestas_ingresos
                    $ciudad = \Illuminate\Support\Facades\DB::table('respuestas_ingresos')
                        ->where('documento', $user->cedula)
                        ->value('ciudad');

                    // 2. Buscar en candidatos (usando ciudad_id)
                    if (!$ciudad) {
                        $ciudad = \Illuminate\Support\Facades\DB::table('candidatos')
                            ->join('ciudades', 'candidatos.ciudad_id', '=', 'ciudades.id')
                            ->where('candidatos.identificacion', $user->cedula)
                            ->value('ciudades.nombre');
                    }

                    // 3. Buscar en base_ingresos
                    if (!$ciudad) {
                        $ciudad = \Illuminate\Support\Facades\DB::table('base_ingresos')
                            ->join('candidatos', 'base_ingresos.candidato_id', '=', 'candidatos.id')
                            ->where('candidatos.identificacion', $user->cedula)
                            ->value('base_ingresos.ciudad');
                    }

                    $user->ciudad = $ciudad;

                    // Género: usar users.genero si es un valor reconocido; si no, buscar en candidatos
                    $generosValidos = ['Masculino', 'Femenino', 'Otro', 'No binario', 'Prefiero no decir'];
                    if (!in_array($user->genero, $generosValidos)) {
                        $user->genero = \Illuminate\Support\Facades\DB::table('candidatos')
                            ->where('identificacion', $user->cedula)
                            ->value('genero');
                    }

                    // Fotografía: si users no tiene, buscar en candidatos
                    if (!$user->fotografia) {
                        $fotoCandidato = \Illuminate\Support\Facades\DB::table('candidatos')
                            ->where('identificacion', $user->cedula)
                            ->value('fotografia');
                        if ($fotoCandidato) {
                            $user->fotografia = $fotoCandidato;
                        }
                    }

                    // Datos desde respuestas_ingresos: tallas, profesión y datos personales nulos
                    $respuesta = \App\Models\RespuestaIngreso::where('documento', $user->cedula)->first();
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
                        $user->fecha_expedicion = \Illuminate\Support\Facades\DB::table('candidatos')
                            ->where('identificacion', $user->cedula)
                            ->value('fecha_expedicion');
                    }

                    // Móvil: si está vacío o es el placeholder por defecto
                    if (!$user->movil || $user->movil === '0000000000') {
                        $celular = $respuesta?->celular
                            ?? \Illuminate\Support\Facades\DB::table('candidatos')
                                ->where('identificacion', $user->cedula)
                                ->value('celular');
                        if ($celular) $user->movil = $celular;
                    }

                    // Email: si parece auto-generado (cedula@dominio)
                    $cedula = $user->cedula ?? '';
                    if ($cedula && $user->email && str_starts_with($user->email, $cedula . '@')) {
                        $realEmail = $respuesta?->correo
                            ?? \Illuminate\Support\Facades\DB::table('candidatos')
                                ->where('identificacion', $cedula)
                                ->value('correo');
                        if ($realEmail) $user->email = $realEmail;
                    }

                    // Caja Compensación: desde contratos → candidatos
                    if (!$user->caja_compensacion) {
                        $caja = \Illuminate\Support\Facades\DB::table('contratos')
                            ->where('empleado_id', $user->id)
                            ->whereNotNull('caja_compensacion')
                            ->orderByDesc('fecha_ingreso')
                            ->value('caja_compensacion');
                        if (!$caja) {
                            $caja = \Illuminate\Support\Facades\DB::table('candidatos')
                                ->where('identificacion', $user->cedula)
                                ->value('caja_compensacion');
                        }
                        if ($caja) $user->caja_compensacion = $caja;
                    }

                    // Empresa: desde requisicion del candidato si no tiene empresa_id
                    if (!$user->empresa_id) {
                        $empresaId = \Illuminate\Support\Facades\DB::table('candidatos')
                            ->join('requisiciones', 'candidatos.requisicion_id', '=', 'requisiciones.id')
                            ->where('candidatos.identificacion', $user->cedula)
                            ->whereNotNull('requisiciones.empresa_id')
                            ->value('requisiciones.empresa_id');
                        if ($empresaId) $user->empresa_id = $empresaId;
                    }

                    // Ingresos: si nulo, buscar en contratos → base_ingresos → candidatos
                    if (is_null($user->ingresos) || $user->ingresos == 0) {
                        $salario = \Illuminate\Support\Facades\DB::table('contratos')
                            ->where('empleado_id', $user->id)
                            ->whereNotNull('salario')
                            ->orderByDesc('fecha_ingreso')
                            ->value('salario');
                        if (!$salario) {
                            $salario = \Illuminate\Support\Facades\DB::table('base_ingresos')
                                ->join('candidatos', 'base_ingresos.candidato_id', '=', 'candidatos.id')
                                ->where('candidatos.identificacion', $user->cedula)
                                ->whereNotNull('base_ingresos.salario_basico')
                                ->orderByDesc('base_ingresos.created_at')
                                ->value('base_ingresos.salario_basico');
                        }
                        if (!$salario) {
                            $salario = \Illuminate\Support\Facades\DB::table('candidatos')
                                ->where('identificacion', $user->cedula)
                                ->value('salario_basico');
                        }
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
            $empleado->update($data);
            return response()->json([
                'empleado'     => $empleado->fresh()->load('empresa'),
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
            'empleado'     => $empleado->load('empresa'),
            'credenciales' => [
                'email'    => $empleado->email,
                'password' => $plainPassword,
            ],
        ], 201);
    }

    public function show(User $empleado)
    {
        return response()->json($empleado->load('empresa'));
    }

    public function update(Request $request, User $empleado)
    {
        $userByEmail = null;
        if ($request->email) {
            $userByEmail = User::where('email', $request->email)->first();
        }

        $existingId = $empleado->id;
        if ($userByEmail && $userByEmail->id !== $empleado->id) {
            // Re-link contracts to userByEmail
            \App\Models\Contrato::where('empleado_id', $empleado->id)
                ->update(['empleado_id' => $userByEmail->id]);

            // Delete the duplicate $empleado
            $empleado->delete();
            
            $empleado = $userByEmail;
            $existingId = $userByEmail->id;
        }

        $data = $request->validate($this->rules($existingId));

        $this->normalizarNombres($data);
        $data['name'] = trim($data['nombres'] . ' ' . $data['apellidos']);

        if ($request->hasFile('fotografia')) {
            $data['fotografia'] = $request->file('fotografia')->store('empleados/fotos', 'public');
        } elseif (!array_key_exists('fotografia', $data) || $data['fotografia'] === null) {
            unset($data['fotografia']);
        }

        $empleado->update($data);

        app(\App\Services\EmpleadoSyncService::class)->syncFromUser($empleado->fresh());

        return response()->json($empleado->fresh()->load('empresa'));
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
