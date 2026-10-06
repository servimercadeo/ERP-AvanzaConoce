<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidato;
use App\Models\CentroCostoCatalogo;
use App\Models\Contrato;
use App\Models\PedidoAutomatico;
use App\Models\RespuestaIngreso;
use App\Models\User;
use App\Services\EmpresaProyectoRules;
use App\Services\ImportacionExcelValidador;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class ContratoController extends Controller
{
    private const MESES_ES = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];

    // Nombre de departamento por código DANE (ciudades.codigo_dep). No existe una tabla
    // "departamentos" en la base — el catálogo de ciudades solo trae el código numérico.
    private const DEPARTAMENTOS_DANE = [
        '05' => 'Antioquia',
        '08' => 'Atlántico',
        '11' => 'Bogotá D.C.',
        '13' => 'Bolívar',
        '15' => 'Boyacá',
        '17' => 'Caldas',
        '18' => 'Caquetá',
        '19' => 'Cauca',
        '20' => 'Cesar',
        '23' => 'Córdoba',
        '25' => 'Cundinamarca',
        '27' => 'Chocó',
        '41' => 'Huila',
        '44' => 'La Guajira',
        '47' => 'Magdalena',
        '50' => 'Meta',
        '52' => 'Nariño',
        '54' => 'Norte de Santander',
        '63' => 'Quindío',
        '66' => 'Risaralda',
        '68' => 'Santander',
        '70' => 'Sucre',
        '73' => 'Tolima',
        '76' => 'Valle del Cauca',
        '81' => 'Arauca',
        '85' => 'Casanare',
        '86' => 'Putumayo',
        '88' => 'San Andrés y Providencia',
        '91' => 'Amazonas',
        '94' => 'Guainía',
        '95' => 'Guaviare',
        '97' => 'Vaupés',
        '99' => 'Vichada',
    ];

    private function fechaEnEspanol(\Carbon\Carbon|string|null $fecha): string
    {
        if (!$fecha) return '';
        $carbon = $fecha instanceof \Carbon\Carbon ? $fecha : \Carbon\Carbon::parse($fecha);
        return mb_strtoupper("{$carbon->day} DE " . self::MESES_ES[$carbon->month - 1] . " DE {$carbon->year}", 'UTF-8');
    }

    /**
     * Correo del jefe inmediato del contrato. `jefe_inmediato_correo` es la fuente de verdad
     * (columna propia, poblada por el import de contratos y por el flujo normal desde ahora en
     * adelante); para contratos viejos que no la tienen, cae al parseo del legacy
     * `jefe_inmediato` de texto libre ("Nombre - correo@..." o solo nombre contra `users.name`).
     */
    private function resolverCorreoSupervisor(Contrato $contrato): ?string
    {
        if ($contrato->jefe_inmediato_correo) {
            return $contrato->jefe_inmediato_correo;
        }

        $jefeInmediato = $contrato->jefe_inmediato;
        if (!$jefeInmediato) {
            return null;
        }

        if (preg_match('/[\w.+-]+@[\w-]+\.[\w.-]+/', $jefeInmediato, $m)) {
            return $m[0];
        }

        $nombre = trim(explode(' - ', $jefeInmediato)[0]);
        if (!$nombre) {
            return null;
        }

        return DB::table('users')->whereRaw('UPPER(name) = ?', [mb_strtoupper($nombre, 'UTF-8')])->value('email');
    }

    /**
     * Departamento (geográfico) del empleado: se resuelve por la sede del contrato (más
     * confiable, ligada a `sedes.id_ciudad`) y si no hay coincidencia, por el texto de ciudad
     * de la respuesta de ingreso. El código DANE de departamento se traduce con
     * self::DEPARTAMENTOS_DANE porque la tabla `ciudades` no guarda el nombre, solo el código.
     */
    private function resolverDepartamento(Contrato $contrato, ?RespuestaIngreso $respuesta): string
    {
        $codigoDep = null;

        if ($contrato->sede) {
            $idCiudad = DB::table('sedes')->where('nombre', $contrato->sede)->value('id_ciudad');
            if ($idCiudad) {
                $codigoDep = DB::table('ciudades')->where('id', $idCiudad)->value('codigo_dep');
            }
        }

        if (!$codigoDep && $respuesta?->ciudad) {
            $codigoDep = DB::table('ciudades')
                ->whereRaw('UPPER(nombre) = ?', [mb_strtoupper(trim($respuesta->ciudad), 'UTF-8')])
                ->value('codigo_dep');
        }

        return self::DEPARTAMENTOS_DANE[$codigoDep] ?? '';
    }

    private function enviarContratoASharepoint(Contrato $contrato): void
    {
        $flowUrl = config('services.sharepoint.contrato_flow_url');
        if (!$flowUrl) return;

        $empleado = $contrato->empleado;
        $cedula   = $empleado?->cedula;
        if (!$cedula) return;

        $respuesta = RespuestaIngreso::where('documento', $cedula)->first();
        $candidato = Candidato::where('identificacion', $cedula)->first();

        $data = [
            'nombres'             => $respuesta?->nombres ?? $empleado->nombres ?? '',
            'apellidos'           => $respuesta?->apellidos ?? $empleado->apellidos ?? '',
            'documento'           => $cedula,
            'celular'             => $respuesta?->celular ?? $empleado->movil ?? '',
            'correo'              => $respuesta?->correo ?? $candidato?->correo ?? $empleado->email ?? '',
            'ciudad'              => $respuesta?->ciudad ?? '',
            'direccion'           => $respuesta?->direccion ?? '',
            'fecha_nacimiento'    => $respuesta?->fecha_nacimiento ?? '',
            'fecha_expedicion'    => optional($candidato?->fecha_expedicion)->format('Y-m-d') ?? '',
            'lugar_expedicion'    => $candidato?->lugar_expedicion ?? '',
            'grupo_rh'            => $respuesta?->rh ?? '',
            'contacto_emergencia' => $respuesta?->emergencia_nombre ?? '',
            'parentesco'          => $respuesta?->emergencia_parentesco ?? '',
            'nro_contacto'        => $respuesta?->emergencia_telefono ?? '',
            'fec_ini_contrato'    => $this->fechaEnEspanol($contrato->fecha_ingreso),
            't_camisa'            => $respuesta?->talla_camisa ?? '',
            't_pantalon'          => $respuesta?->talla_pantalon ?? '',
            't_zapatos'           => $respuesta?->talla_zapatos ?? '',
            'CorreoSuper'         => $this->resolverCorreoSupervisor($contrato) ?? '',
            'Departamento'        => $this->resolverDepartamento($contrato, $respuesta),
        ];

        try {
            Http::timeout(15)->asJson()->post($flowUrl, $data);
        } catch (\Exception $e) {
            Log::warning('No se pudo enviar el contrato a SharePoint para cédula ' . $cedula . ': ' . $e->getMessage());
        }
    }

    /**
     * Valida cada centro de costo contra el catálogo (empresa+código deben existir), rechaza
     * códigos repetidos dentro del mismo contrato, y exige que la suma de porcentajes no supere
     * 100%. Devuelve los items resueltos (con el nombre oficial del catálogo) listos para crear.
     */
    private function validarYResolverCentrosCosto(array $items): array
    {
        if (empty($items)) {
            return [];
        }

        $vistos    = [];
        $resueltos = [];
        $suma      = 0;

        foreach ($items as $item) {
            $catalogoId = (int) ($item['centro_costo_catalogo_id'] ?? 0);
            $porcentaje = round((float) ($item['porcentaje'] ?? 0), 2);

            if (isset($vistos[$catalogoId])) {
                throw ValidationException::withMessages([
                    'centros_costos' => "Ese centro de costo está repetido en el contrato. Usa una sola fila y ajusta el porcentaje.",
                ]);
            }
            $vistos[$catalogoId] = true;

            $catalogo = CentroCostoCatalogo::where('id', $catalogoId)
                ->where('activo', true)
                ->first();

            if (!$catalogo) {
                throw ValidationException::withMessages([
                    'centros_costos' => "El centro de costo seleccionado no existe.",
                ]);
            }

            if ($porcentaje <= 0) {
                throw ValidationException::withMessages([
                    'centros_costos' => "El porcentaje del centro de costo \"{$catalogo->codigo}\" debe ser mayor a 0%.",
                ]);
            }

            $suma += $porcentaje;

            $resueltos[] = [
                'centro_costo_catalogo_id' => $catalogo->id,
                'codigo'                   => $catalogo->codigo,
                'centro_costos'            => $catalogo->nombre,
                'porcentaje'               => $porcentaje,
            ];
        }

        if (round($suma, 2) > 100) {
            throw ValidationException::withMessages([
                'centros_costos' => "La suma de porcentajes de los centros de costo es {$suma}% y no puede superar 100%. Reduce el porcentaje de un centro de costo existente antes de agregar otro.",
            ]);
        }

        return $resueltos;
    }

    // Un contrato en "No ingreso" significa que el empleado nunca llegó a
    // ingresar: cualquier pedido automático de dotación generado para él (activo
    // o completado) restaura el inventario descontado y se elimina, igual que un
    // pedido cancelado manualmente (ver PedidoAutomaticoController::destroy).
    private function eliminarPedidosAutomaticosDeContrato(Contrato $contrato): void
    {
        $pedidos = PedidoAutomatico::where('contrato_id', $contrato->id)->get();
        foreach ($pedidos as $pedido) {
            if (in_array($pedido->estado, ['Activo', 'Completado'], true)) {
                foreach ($pedido->items()->with('inventario')->get() as $item) {
                    if ($item->inventario) {
                        $item->inventario->increment('cantidad', $item->cantidad);
                    }
                }
            }
            $pedido->delete();
        }
    }

    public function index(Request $request)
    {
        // `empleado.sedeCatalogo` (no solo `empleado`): el accessor `sede` de User
        // (HasSedeCatalogo) dispara una consulta por fila si no viene precargado.
        $query = Contrato::with(['empleado.sedeCatalogo', 'centrosCostos', 'anexos', 'eventosMedicos', 'regional', 'sedeCatalogo']);

        // Anulados solo se muestran cuando se filtra explícitamente por ese estado
        if ($request->estado === 'Contrato anulado') {
            $query->where('completado', false);
        } else {
            $query->where('completado', true);
        }

        if ($request->search) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->whereHas('empleado', function ($inner) use ($s) {
                    $inner->where('name', 'like', "%$s%")
                          ->orWhere('nombres', 'like', "%$s%")
                          ->orWhere('apellidos', 'like', "%$s%")
                          ->orWhere('cedula', 'like', "%$s%");
                })->orWhere('cargo', 'like', "%$s%");
            });
        }

        // El filtro de estado ya fue manejado arriba via completado
        if ($request->estado && $request->estado !== 'Todos' && $request->estado !== 'Contrato anulado') {
            $query->where('estado_contrato', $request->estado);
        }

        if ($request->sede && $request->sede !== 'Todas') {
            $query->where('sede', $request->sede);
        }

        $contratos = $query->orderBy('created_at', 'desc')->get();

        // Derivar proyecto actual desde candidatos → requisicion → proyecto (sin N+1)
        $cedulas = $contratos->pluck('empleado.cedula')->filter()->unique()->values()->toArray();
        $proyectoPorCedula = [];
        if (!empty($cedulas)) {
            Candidato::whereIn('identificacion', $cedulas)
                ->with('requisicion.proyecto')
                ->orderBy('id', 'desc')
                ->get()
                ->each(function ($c) use (&$proyectoPorCedula) {
                    $ced = $c->identificacion;
                    if (!isset($proyectoPorCedula[$ced]) && $c->requisicion?->proyecto?->nombre) {
                        $proyectoPorCedula[$ced] = $c->requisicion->proyecto->nombre;
                    }
                });
        }

        // Fotos de candidatos que faltan en `users.fotografia`, resueltas en bloque (sin N+1)
        $cedulasSinFoto = $contratos->filter(fn($c) => $c->empleado && !$c->empleado->fotografia)
            ->pluck('empleado.cedula')->filter()->unique()->values()->toArray();
        $fotoPorCedula = !empty($cedulasSinFoto)
            ? DB::table('candidatos')->whereIn('identificacion', $cedulasSinFoto)
                ->whereNotNull('fotografia')->pluck('fotografia', 'identificacion')
            : collect();

        $contratos = $contratos->map(function ($contrato) use ($proyectoPorCedula, $fotoPorCedula) {
            $cedula = $contrato->empleado?->cedula;
            if ($contrato->empleado && !$contrato->empleado->fotografia) {
                $foto = $fotoPorCedula->get($cedula);
                if ($foto) {
                    $contrato->empleado->fotografia = $foto;
                }
            }
            if ($cedula && !empty($proyectoPorCedula[$cedula])) {
                $contrato->cliente_proyecto = $proyectoPorCedula[$cedula];
            }
            return $contrato;
        });

        return response()->json($contratos);
    }

    private function crearContratoYEmpleado(Request $request): Contrato
    {
        if (empty($request->empleado_id) && $request->documento) {
            // Proceso: el contrato se crea primero y el empleado queda "pendiente de alta"
            // hasta que Empleados (formulario o Importar Excel) completa su ficha y le
            // entrega credenciales. Mientras tanto no puede iniciar sesión (AuthController).
            $documento = trim((string) $request->documento);
            // Si el correo ya es de otra persona, se usa el autogenerado en vez de fallar
            // por el índice único de `users.email`.
            $correo = trim((string) $request->correo);
            $duenoCorreo = $correo === '' ? null : \App\Models\User::where('email', $correo)->first();
            if ($correo === '' || ($duenoCorreo && (string) $duenoCorreo->cedula !== $documento)) {
                $correo = $documento . '@avanzaconoce.com';
            }
            $user = \App\Models\User::firstOrCreate(
                ['cedula' => $documento],
                [
                    'nombres' => mb_strtoupper($request->nombres ?? '', 'UTF-8'),
                    'apellidos' => mb_strtoupper($request->apellidos ?? '', 'UTF-8'),
                    'name' => trim(mb_strtoupper($request->nombres ?? '', 'UTF-8') . ' ' . mb_strtoupper($request->apellidos ?? '', 'UTF-8')),
                    'email' => $correo,
                    // Nunca la cédula como contraseña: las credenciales reales se generan al dar el alta.
                    'password' => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(40)),
                    'pendiente_alta' => true,
                    'sede' => $request->sede ?? 'Principal',
                    'cargo' => mb_strtoupper($request->cargo ?? '', 'UTF-8') ?: 'SIN ASIGNAR',
                    'estado_empleado' => 'Activo',
                    'tipo_funcionario' => 'Consultor',
                    'tipo_vinculacion' => $request->tipo_vinculacion ?? 'Indefinido',
                    'eps' => $request->lps_afiliado ?? 'Sin asignar',
                    'arl' => $request->arl ?? 'Sin asignar',
                    'genero' => 'No especificado',
                    'movil' => '0000000000',
                ]
            );
            // Copiar fotografia del candidato si el usuario fue creado nuevo
            if ($user->wasRecentlyCreated) {
                $fotoCandidato = \Illuminate\Support\Facades\DB::table('candidatos')
                    ->where('identificacion', $request->documento)
                    ->value('fotografia');
                if ($fotoCandidato) {
                    $user->fotografia = $fotoCandidato;
                    $user->save();
                }
            }

            $request->merge(['empleado_id' => $user->id]);
        }

        $data = $request->validate([
            'empleado_id'              => 'required|exists:users,id',
            'tipo_contrato'           => 'nullable|string',
            'tipo_vinculacion'        => 'nullable|string',
            'cargo'                   => 'nullable|string',
            'sede'                    => 'nullable|string',
            'area_empresa'            => 'nullable|string',
            'jefe_inmediato'          => 'nullable|string',
            'jefe_inmediato_correo'   => 'nullable|email|max:180',
            'fecha_ingreso'           => 'nullable|date',
            'fecha_retiro'            => 'nullable|date',
            'salario'                 => 'nullable|numeric',
            'auxilio_transporte_legal' => 'nullable|numeric',
            'arl'                     => 'nullable|string',
            'fecha_vinculacion_arl'    => 'nullable|date',
            'lps_afiliado'            => 'nullable|string',
            'fecha_vinculacion_lps'    => 'nullable|date',
            'caja_compensacion'       => 'nullable|string',
            'fecha_vinculacion_caja'   => 'nullable|date',
            'fondo_pensiones'         => 'nullable|string',
            'fondo_cesantias'         => 'nullable|string',
            'banco'                   => 'nullable|string|max:100',
            'tipo_cuenta'             => 'nullable|string|max:30',
            'cuenta_bancaria'         => 'nullable|string|max:30',
            'estado_contrato'         => 'nullable|string',
            'empleador'               => 'nullable|string',
            'empresa'                 => 'nullable|string',
            'cliente_proyecto'        => 'nullable|string',
            'regional_id'             => 'nullable|exists:regionales,id',
            'origen_seguimiento'      => 'nullable|string',
            'centros_costos'                              => 'nullable|array',
            'centros_costos.*.centro_costo_catalogo_id'   => 'required_with:centros_costos|integer|exists:centros_costo_catalogo,id',
            'centros_costos.*.porcentaje'                 => 'required_with:centros_costos|numeric|min:0.01|max:100',
            'anexos'                       => 'nullable|array',
            'eventos_medicos'              => 'nullable|array',
            'seguimiento_fecha_cierre'     => 'nullable|date',
            'seguimiento_observaciones'    => 'nullable|array',
        ]);

        if ($msg = EmpresaProyectoRules::validar($data['empresa'] ?? null, $data['cliente_proyecto'] ?? null)) {
            throw ValidationException::withMessages(['cliente_proyecto' => $msg]);
        }

        $data['centros_costos'] = $this->validarYResolverCentrosCosto($data['centros_costos'] ?? []);

        return DB::transaction(function() use ($data) {
            $data['completado'] = true;

            $contrato = Contrato::create($data);

            if (!empty($data['centros_costos'])) {
                foreach ($data['centros_costos'] as $cc) {
                    $contrato->centrosCostos()->create($cc);
                }
            }

            if (!empty($data['anexos'])) {
                foreach ($data['anexos'] as $anexo) {
                    $contrato->anexos()->create($anexo);
                }
            }

            if (!empty($data['eventos_medicos'])) {
                foreach ($data['eventos_medicos'] as $ev) {
                    $contrato->eventosMedicos()->create($ev);
                }
            }

            return $contrato;
        });
    }

    public function store(Request $request)
    {
        // Crear al empleado pendiente (si la cédula es nueva) y el contrato es una sola
        // operación: si algo falla después de crear el usuario (validación del contrato,
        // auditoría, etc.), no debe quedar un empleado huérfano sin contrato.
        $contrato = DB::transaction(fn () => $this->crearContratoYEmpleado($request));

        $this->enviarContratoASharepoint($contrato);

        // Sync campos del contrato al empleado
        app(\App\Services\EmpleadoSyncService::class)->syncDesdeContrato($contrato);

        $pedidoAutomatico = null;
        if ($contrato->estado_contrato !== 'No ingreso') {
            try {
                $pedidoAutomatico = app(\App\Services\DotacionAutoPedidoService::class)->generarPedidoParaContrato($contrato);
            } catch (\Throwable $e) {
                Log::error('No se pudo generar el pedido automático de dotación para el contrato ' . $contrato->id, [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $contratoData = $contrato->load(['empleado', 'centrosCostos', 'anexos', 'eventosMedicos', 'regional', 'sedeCatalogo'])->toArray();
        $contratoData['pedido_automatico'] = $pedidoAutomatico
            ? ['id' => $pedidoAutomatico->id, 'codigo' => $pedidoAutomatico->codigo, 'estado' => $pedidoAutomatico->estado]
            : null;

        return response()->json($contratoData, 201);
    }

    public function show(Contrato $contrato)
    {
        return response()->json($contrato->load(['empleado', 'centrosCostos', 'anexos', 'eventosMedicos', 'regional', 'sedeCatalogo']));
    }

    public function update(Request $request, Contrato $contrato)
    {
        $data = $request->validate([
            'empleado_id'              => 'required|exists:users,id',
            'tipo_contrato'           => 'nullable|string',
            'tipo_vinculacion'        => 'nullable|string',
            'cargo'                   => 'nullable|string',
            'sede'                    => 'nullable|string',
            'area_empresa'            => 'nullable|string',
            'jefe_inmediato'          => 'nullable|string',
            'jefe_inmediato_correo'   => 'nullable|email|max:180',
            'fecha_ingreso'           => 'nullable|date',
            'fecha_retiro'            => 'nullable|date',
            'salario'                 => 'nullable|numeric',
            'auxilio_transporte_legal' => 'nullable|numeric',
            'arl'                     => 'nullable|string',
            'fecha_vinculacion_arl'    => 'nullable|date',
            'lps_afiliado'            => 'nullable|string',
            'fecha_vinculacion_lps'    => 'nullable|date',
            'caja_compensacion'       => 'nullable|string',
            'fecha_vinculacion_caja'   => 'nullable|date',
            'fondo_pensiones'         => 'nullable|string',
            'fondo_cesantias'         => 'nullable|string',
            'banco'                   => 'nullable|string|max:100',
            'tipo_cuenta'             => 'nullable|string|max:30',
            'cuenta_bancaria'         => 'nullable|string|max:30',
            'estado_contrato'         => 'nullable|string',
            'empleador'               => 'nullable|string',
            'empresa'                 => 'nullable|string',
            'cliente_proyecto'        => 'nullable|string',
            'regional_id'             => 'nullable|exists:regionales,id',
            'origen_seguimiento'      => 'nullable|string',
            'centros_costos'                              => 'nullable|array',
            'centros_costos.*.centro_costo_catalogo_id'   => 'required_with:centros_costos|integer|exists:centros_costo_catalogo,id',
            'centros_costos.*.porcentaje'                 => 'required_with:centros_costos|numeric|min:0.01|max:100',
            'anexos'                       => 'nullable|array',
            'eventos_medicos'              => 'nullable|array',
            'seguimiento_fecha_cierre'     => 'nullable|date',
            'seguimiento_observaciones'    => 'nullable|array',
        ]);

        $empresaFinal = array_key_exists('empresa', $data) ? $data['empresa'] : $contrato->empresa;
        $proyectoFinal = array_key_exists('cliente_proyecto', $data) ? $data['cliente_proyecto'] : $contrato->cliente_proyecto;
        if ($msg = EmpresaProyectoRules::validar($empresaFinal, $proyectoFinal)) {
            throw ValidationException::withMessages(['cliente_proyecto' => $msg]);
        }

        $data['centros_costos'] = $this->validarYResolverCentrosCosto($data['centros_costos'] ?? []);

        $result = DB::transaction(function() use ($contrato, $data) {
            $data['completado'] = true;

            $contrato->update($data);

            if ($contrato->estado_contrato === 'No ingreso') {
                $this->eliminarPedidosAutomaticosDeContrato($contrato);
            }

            // Sincronizar centros de costos
            $contrato->centrosCostos()->delete();
            if (!empty($data['centros_costos'])) {
                foreach ($data['centros_costos'] as $cc) {
                    $contrato->centrosCostos()->create($cc);
                }
            }

            // Sincronizar anexos
            $contrato->anexos()->delete();
            if (!empty($data['anexos'])) {
                foreach ($data['anexos'] as $anexo) {
                    $contrato->anexos()->create($anexo);
                }
            }

            // Sincronizar eventos médicos
            $contrato->eventosMedicos()->delete();
            if (!empty($data['eventos_medicos'])) {
                foreach ($data['eventos_medicos'] as $ev) {
                    $contrato->eventosMedicos()->create($ev);
                }
            }

            return $contrato->load(['empleado', 'centrosCostos', 'anexos', 'eventosMedicos', 'regional', 'sedeCatalogo']);
        });

        // Sync campos del contrato al empleado
        app(\App\Services\EmpleadoSyncService::class)->syncDesdeContrato($result);

        return response()->json($result);
    }

    public function destroy(Contrato $contrato)
    {
        $contrato->delete();
        return response()->json(null, 204);
    }

    /**
     * Rellenar datos faltantes de contratos desde Excel, buscando por Documento (cédula)
     * del empleado y actualizando su contrato más reciente.
     *
     * Regla de seguridad (no negociable, igual que en
     * EmpleadoController@importarDatosPersonales): por cada campo, solo se escribe si el
     * valor actual en BD está vacío/NULL. Un campo que ya tiene dato se deja intacto y se
     * reporta como omitido, nunca se sobreescribe. Nunca crea contratos: lo usa "Importar
     * Excel" de Contratos para las cédulas que ya tienen uno (las demás se crean con store()).
     */
    public function importarDatosFaltantes(Request $request)
    {
        // Solo se valida la forma del lote; cada fila se valida/descarta puntualmente más
        // abajo (ver EmpleadoController@importarDatosPersonales para el porqué de no usar
        // `filas.*.campo` aquí: validate() descarta cualquier campo sin regla declarada).
        $request->validate([
            'filas' => 'required|array|min:1|max:2000',
        ]);
        $filas = $request->input('filas', []);

        $camposPermitidos = [
            'cargo', 'sede', 'area_empresa', 'jefe_inmediato', 'jefe_inmediato_correo',
            'tipo_vinculacion', 'arl', 'fecha_vinculacion_arl', 'lps_afiliado',
            'fecha_vinculacion_lps', 'caja_compensacion', 'fecha_vinculacion_caja',
            'fondo_pensiones', 'fondo_cesantias', 'empleador', 'cliente_proyecto',
        ];
        $camposFecha = ['fecha_vinculacion_arl', 'fecha_vinculacion_lps', 'fecha_vinculacion_caja'];
        // Límite real de cada columna varchar en `contratos` (ver migraciones). Un valor
        // más largo rompería el UPDATE completo del lote con un 500 — mejor omitir solo
        // ese campo que perder las 2000 filas por una celda demasiado larga.
        $longitudesMaximas = [
            'cargo' => 100, 'sede' => 100, 'area_empresa' => 100,
            'jefe_inmediato' => 150, 'jefe_inmediato_correo' => 180, 'tipo_vinculacion' => 30,
            'arl' => 100, 'lps_afiliado' => 100, 'caja_compensacion' => 100,
            'fondo_pensiones' => 100, 'fondo_cesantias' => 100,
            'empleador' => 150, 'cliente_proyecto' => 150,
        ];

        $resumen = [
            'actualizados'   => 0,
            'sin_cambios'    => 0,
            'no_encontrados' => [],
            'detalle'        => [],
        ];

        DB::transaction(function () use ($filas, $camposPermitidos, $camposFecha, $longitudesMaximas, &$resumen) {
            foreach ($filas as $fila) {
                if (!is_array($fila) || !is_scalar($fila['documento'] ?? null)) continue;
                $documento = trim((string) $fila['documento']);
                if ($documento === '') continue;

                $empleado = User::where('cedula', $documento)->first();
                // Solo contratos vigentes (completado = true), los mismos que muestra la
                // lista: un contrato anulado más reciente no debe recibir los datos.
                $contrato = $empleado
                    ? Contrato::where('empleado_id', $empleado->id)
                        ->where('completado', true)
                        ->orderByDesc('fecha_ingreso')
                        ->orderByDesc('id')
                        ->first()
                    : null;

                if (!$contrato) {
                    $resumen['no_encontrados'][] = $documento;
                    continue;
                }

                $actualizadosFila = [];
                $omitidosFila = [];
                // Celdas con un valor que no se pudo aceptar: se omiten y se reportan.
                $invalidosFila = [];

                foreach ($camposPermitidos as $campo) {
                    if (!array_key_exists($campo, $fila)) continue;
                    $valor = $fila[$campo];
                    $valor = is_string($valor) ? trim($valor) : $valor;
                    if ($valor === null || $valor === '') continue;

                    $valor = $this->valorImportable($campo, $valor, $contrato, $camposFecha, $longitudesMaximas);
                    if ($valor === null) {
                        $invalidosFila[] = $campo;
                        continue;
                    }

                    $actual = $contrato->{$campo};
                    $vacioActual = $actual === null || $actual === '';

                    if (!$vacioActual) {
                        $omitidosFila[] = $campo;
                        continue;
                    }

                    $contrato->{$campo} = $valor;
                    $actualizadosFila[] = $campo;
                }

                if (!empty($actualizadosFila)) {
                    $contrato->save();
                    $resumen['actualizados']++;
                } else {
                    $resumen['sin_cambios']++;
                }

                $resumen['detalle'][] = [
                    'documento'           => $documento,
                    'nombre'              => trim(($empleado->nombres ?? '') . ' ' . ($empleado->apellidos ?? '')),
                    'campos_actualizados' => $actualizadosFila,
                    'campos_omitidos'     => $omitidosFila,
                    'campos_invalidos'    => $invalidosFila,
                ];
            }
        });

        return response()->json($resumen);
    }

    /** Valor de una celda del import ya validado, o null si no es aceptable. */
    private function valorImportable(string $campo, mixed $valor, Contrato $contrato, array $camposFecha, array $longitudesMaximas): ?string
    {
        if (!is_scalar($valor) || is_bool($valor)) {
            return null;
        }
        $valor = trim((string) $valor);
        if (isset($longitudesMaximas[$campo]) && mb_strlen($valor) > $longitudesMaximas[$campo]) {
            return null;
        }

        if (in_array($campo, $camposFecha, true)) {
            return ImportacionExcelValidador::fecha($valor, 1950, (int) date('Y') + 1);
        }

        return match ($campo) {
            'jefe_inmediato_correo' => ImportacionExcelValidador::correo($valor),
            'sede' => ImportacionExcelValidador::sede($valor),
            // La misma regla empresa ↔ proyecto que exigen store() y update().
            'cliente_proyecto' => EmpresaProyectoRules::validar($contrato->empresa, $valor) === null ? $valor : null,
            default => $valor,
        };
    }

}
