<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProveedorWorkOrder;
use App\Models\Supervisor;
use App\Models\Torre;
use App\Models\User;
use App\Models\Vehiculo;
use App\Models\WorkOrder;
use App\Services\AuxilioProductividad;
use App\Services\UsuarioAliadoEmpresa;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class WorkOrderController extends Controller
{
    /**
     * Estados de los indicadores (los mismos que cuenta la ficha del aliado). Una WO solo está
     * Asignada o Finalizada: el estado "Atendido" ya no existe (ver aplicarEstadoPorTecnico).
     */
    private const ESTADO_ASIGNADA = 'Asignado';
    private const ESTADO_FINALIZADA = 'Finalizado';

    // Cómo atendió un directo al finalizar la WO (columna "Modo Atención" del exporte).
    private const SOLO = 'SOLO';
    private const ACOMPANADO = 'ACOMPAÑADO';

    /**
     * Con ?page= responde por páginas (?per_page=25|50|100, por defecto 50): con miles de
     * WOs, traerlas todas pesaba megas y la tabla tardaba en pintarse. Sin ?page= devuelve
     * la lista completa, como antes.
     */
    public function index(Request $request)
    {
        $query = $this->filtrar($this->visibles($request), $request)
            ->orderByDesc('fecha_estado')->orderByDesc('id');

        if ($request->has('page')) {
            $porPagina = (int) $request->per_page;
            $pagina = $query->paginate(in_array($porPagina, [25, 50, 100], true) ? $porPagina : 50);
            // "Cambiar estado" pregunta SOLO/ACOMPAÑADO únicamente en las WO de directos.
            $tecnicos = $this->tecnicosDe($pagina->getCollection());
            $pagina->getCollection()->each(fn (WorkOrder $wo) => $wo->tipo_tecnico = $this->tipoDeTecnico($wo, $tecnicos));
            return response()->json($pagina);
        }

        // Sin ?page=: lo usa el Exportar Excel, así que de una vez se completa con la sede del
        // proveedor y con datos del técnico que la WO no trae (vinculación, supervisor,
        // aliado, vehículo asignado) en vez de dejarlos como "N/D" pudiéndolos sacar de su ficha.
        return response()->json($this->conDatosDelTecnico($this->conSedeDelProveedor($query->get())));
    }

    // Sin asociación queda vacía: así se nota qué proveedor falta asociar en Sedes.
    private function conSedeDelProveedor($workOrders)
    {
        $proveedores = ProveedorWorkOrder::with('sede:id,nombre')->get()->keyBy('codigo');
        // Columna "Torre": la persona asignada a esa sede en Parámetros > Operativos > Torres.
        $torres = Torre::with('user:id,name', 'items')->get()
            ->flatMap(fn (Torre $t) => $t->items->map(fn ($sede) => [$sede->id, $t->user?->name]))
            ->mapWithKeys(fn ($par) => [$par[0] => $par[1]]);

        return $workOrders->each(function (WorkOrder $wo) use ($proveedores, $torres) {
            $proveedor = $wo->proveedor ? $proveedores->get(ProveedorWorkOrder::codigoDe($wo->proveedor)) : null;
            $wo->sede_proveedor = $proveedor?->sede?->nombre;
            $wo->torre_sede = $proveedor ? $torres->get($proveedor->sede_id) : null;
        });
    }

    /**
     * Agrega a cada WO los datos de su técnico, por `cedula_tecnico` (la misma cédula con la
     * que el técnico ve sus WO y se cuentan en su aliado; mismo formato que `users.cedula`): no viven en
     * `work_orders` pero si el técnico ya es empleado del ERP, ahí están. Una sola consulta
     * por lote, no una por fila.
     */
    private function conDatosDelTecnico($workOrders)
    {
        $cedulaAsignado = fn (WorkOrder $wo) => $wo->cedula_tecnico;

        $cedulas = $workOrders->map($cedulaAsignado)->filter()->unique()->values();

        $tecnicos = User::whereIn('cedula', $cedulas)
            ->with('aliado:id,nombre')
            ->get(['id', 'cedula', 'tipo_vinculacion', 'jefe_inmediato', 'aliado_id'])
            ->keyBy('cedula');

        $vehiculosPorTecnico = Vehiculo::whereIn('tecnico_asignado_id', $tecnicos->pluck('id')->filter())
            ->get(['placa', 'tipo', 'tecnico_asignado_id'])
            ->keyBy('tecnico_asignado_id');

        $valorAuxilioPorMes = $this->valorDeAuxilioPorMes($workOrders);

        // Columna "Supervisor": el de Parámetros > Operativos > Supervisores; si no tiene, su jefe inmediato.
        $supervisorPorTecnico = Supervisor::with(['user:id,name', 'items' => fn ($q) => $q->whereKey($tecnicos->pluck('id'))])
            ->get()
            ->flatMap(fn (Supervisor $s) => $s->items->map(fn ($t) => [$t->id, $s->user?->name]))
            ->mapWithKeys(fn ($par) => [$par[0] => $par[1]]);

        return $workOrders->map(function (WorkOrder $wo) use ($tecnicos, $vehiculosPorTecnico, $supervisorPorTecnico, $valorAuxilioPorMes, $cedulaAsignado) {
            $tecnico = $tecnicos->get($cedulaAsignado($wo));
            $wo->tipo_vinculacion_tecnico = $tecnico?->tipo_vinculacion;
            $wo->supervisor_tecnico = ($tecnico ? $supervisorPorTecnico->get($tecnico->id) : null) ?? $tecnico?->jefe_inmediato;
            // "NA" (no "N/D"): si el técnico existe, SÍ sabemos si tiene aliado o no; "N/D"
            // es solo para lo que el sistema no puede saber en absoluto.
            $wo->subagente_aliado_tecnico = $tecnico ? ($tecnico->aliado?->nombre ?? 'NA') : null;
            $vehiculo = $tecnico ? $vehiculosPorTecnico->get($tecnico->id) : null;
            $wo->placa_vehiculo_tecnico = $vehiculo?->placa;

            // "Técnico Atiende" del exporte: el de un técnico de aliado es siempre el mismo
            // técnico agendado (por defecto la matriz no les deja cambiar el estado). Si es
            // directo (o no está registrado en el ERP), manda quien la haya cerrado de verdad
            // desde el sistema; si todavía nadie la cerró ahí (la mayoría: llegan ya cerradas
            // en el archivo del proveedor), se usa el "Técnico Atiende" que trajo el import.
            // Sin usuario en el ERP decide la MODALIDAD del archivo, como en aplicarEstadoPorTecnico.
            $esAliado = $tecnico
                ? (bool) $tecnico->aliado_id
                : mb_strtoupper(trim((string) $wo->modalidad), 'UTF-8') === 'ALIADO';
            if ($esAliado) {
                $wo->nombre_tecnico_atiende = $wo->tecnico_agendado ?: $wo->nombre_tecnico;
                $wo->cedula_tecnico_atiende = $wo->cedula_tecnico_agendado ?: $wo->cedula_tecnico;
            } else {
                $wo->nombre_tecnico_atiende = $wo->nombre_tecnico_cierre ?: $wo->nombre_tecnico;
                $wo->cedula_tecnico_atiende = $wo->cedula_tecnico_cierre ?: $wo->cedula_tecnico;
            }

            // "Fecha registro material", "Modo Atención" y "Auxiliar" del exporte: solo de directos.
            $wo->fecha_cierre_tecnico = !$esAliado && $wo->estado === 'Finalizado'
                ? $wo->fecha_finalizacion?->format('Y-m-d H:i')
                : null;
            $wo->modo_atencion_directo = $esAliado ? null : $wo->modo_atencion;
            $wo->auxiliar_directo = $esAliado ? null : $wo->auxiliar;

            // "Conductor": el mismo técnico que atendió el servicio.
            $wo->conductor_tecnico = $wo->nombre_tecnico_atiende;
            // "Tipo Auxilio": el vehículo del directo (Carro/Moto); el de un aliado no lo pone la empresa.
            $wo->tipo_auxilio_vehiculo = $esAliado ? 'N/A' : $vehiculo?->tipo;
            // "Auxilio": lo que se le paga a ESTA orden según el tramo del mes (ver AuxilioProductividad).
            $mes = $wo->fecha_finalizacion?->format('Y-m');
            $wo->auxilio_calculado = $mes
                ? $valorAuxilioPorMes->get($mes)?->get(AuxilioProductividad::cedulaDe($wo))
                : null;

            return $wo;
        });
    }

    /**
     * Valor del auxilio por orden, como mes => (cédula => valor). El total del mes se cuenta
     * sobre TODAS las WO de ese técnico, no solo las que trae el exporte: al pasar de tramo se
     * recalculan todas sus órdenes del mes. Una consulta por cada mes que aparezca.
     */
    private function valorDeAuxilioPorMes($workOrders)
    {
        $usuarios = AuxilioProductividad::usuariosPorCedula();

        return $workOrders
            ->filter(fn (WorkOrder $wo) => $wo->estado === self::ESTADO_FINALIZADA
                && $wo->fecha_finalizacion
                && AuxilioProductividad::esDirecto($wo, $usuarios))
            ->groupBy(fn (WorkOrder $wo) => $wo->fecha_finalizacion->format('Y-m'))
            ->map(fn ($delMes, $mes) => AuxilioProductividad::valorPorOrdenDelMes(
                $mes,
                $usuarios,
                $delMes->map(fn (WorkOrder $wo) => AuxilioProductividad::cedulaDe($wo))->unique()->values()->all(),
            ));
    }

    /**
     * Total, conteo por estado, indicadores y opciones de los filtros sin descargar las WOs.
     * Los indicadores (total, asignadas, finalizadas; igual que en la ficha del aliado) cuentan
     * con los filtros que vengan (búsqueda, fechas, proveedor...); `total`, `por_estado` y las
     * opciones de los filtros, sobre todas las que el usuario ve.
     */
    public function resumen(Request $request)
    {
        $distintos = fn (string $columna) => $this->visibles($request)
            ->whereNotNull($columna)->where($columna, '!=', '')
            ->distinct()->orderBy($columna)->pluck($columna);

        $indicadores = $this->filtrar($this->visibles($request), $request)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(estado = ?) as asignadas', [self::ESTADO_ASIGNADA])
            ->selectRaw('SUM(estado = ?) as finalizadas', [self::ESTADO_FINALIZADA])
            ->first();

        return response()->json([
            'total'       => $this->visibles($request)->count(),
            'por_estado'  => $this->visibles($request)->select('estado', DB::raw('COUNT(*) as total'))->groupBy('estado')->pluck('total', 'estado'),
            'indicadores' => [
                'total'       => (int) $indicadores->total,
                'asignadas'   => (int) $indicadores->asignadas,
                'finalizadas' => (int) $indicadores->finalizadas,
            ],
            'estados'     => $distintos('estado'),
            'proveedores' => $distintos('proveedor'),
        ]);
    }

    /** Un técnico o un aliado solo modifica las WO que ve (las demás, como si no existieran). */
    private function soloLasQueVe(Request $request, WorkOrder $workOrder): void
    {
        if (in_array($request->user()?->rol, ['tecnico', 'supervisores', UsuarioAliadoEmpresa::ROL], true)) {
            abort_unless($this->visibles($request)->whereKey($workOrder->id)->exists(), 404);
        }
    }

    /** Las WOs que este usuario puede ver. */
    private function visibles(Request $request)
    {
        $query = WorkOrder::query();

        // El rol "tecnico" (directo o de un aliado) solo ve las asignadas a su propia cédula;
        // el usuario de un aliado empresa, las de sus técnicos (si la matriz le abre el
        // módulo); el resto de roles con acceso al submódulo las ve todas. Sin cédula no ve
        // ninguna (nunca todas por descarte de "IS NULL").
        $user = $request->user();
        if ($user?->rol === 'tecnico') {
            $query->where('cedula_tecnico', $user->cedula ?? '__sin_cedula__');
        } elseif ($user?->rol === UsuarioAliadoEmpresa::ROL) {
            $aliadoId = $user->aliadoEmpresa()->value('id');
            $query->whereIn('cedula_tecnico', User::where('aliado_id', $aliadoId ?? 0)->whereNotNull('cedula')->select('cedula'));
        } elseif ($user?->rol === 'supervisores') {
            // El supervisor: solo las de los técnicos a su cargo (no las de otras ciudades).
            $query->whereIn('cedula_tecnico', self::tecnicosACargoDe($user)->whereNotNull('cedula')->select('cedula'));
        }

        return $query;
    }

    /**
     * Técnicos a cargo de un supervisor: los que lo tienen de jefe inmediato en su ficha o en
     * su contrato (por correo, o por nombre en el texto "Nombre - correo" de antes), y los
     * técnicos de los aliados que él lidera (jefe inmediato del aliado).
     */
    public static function tecnicosACargoDe(User $supervisor)
    {
        $correo = mb_strtolower(trim((string) $supervisor->email));
        $nombre = mb_strtoupper(trim((string) $supervisor->name), 'UTF-8');

        $esSuJefe = function ($q) use ($correo, $nombre) {
            $q->whereRaw('1 = 0');
            if ($correo !== '') {
                $q->orWhereRaw('LOWER(TRIM(jefe_inmediato_correo)) = ?', [$correo])
                    ->orWhereRaw('LOWER(jefe_inmediato) LIKE ?', ['%' . $correo . '%']);
            }
            if ($nombre !== '') {
                $q->orWhereRaw("UPPER(TRIM(SUBSTRING_INDEX(jefe_inmediato, ' - ', 1))) = ?", [$nombre])
                    ->orWhereRaw('UPPER(TRIM(jefe_inmediato_nombre)) = ?', [$nombre]);
            }
        };

        return User::where('rol', 'tecnico')->where(function ($q) use ($esSuJefe, $supervisor) {
            $q->where($esSuJefe)
                ->orWhereHas('contratos', $esSuJefe)
                ->orWhereIn('aliado_id', \App\Models\Aliado::where('jefe_inmediato_id', $supervisor->id)->select('id'));
        });
    }

    private function filtrar($query, Request $request)
    {
        if ($request->search) {
            $q = $request->search;
            $query->where(function ($w) use ($q) {
                $w->where('numero_wo', 'like', "%{$q}%")
                    ->orWhere('numero_wo_ibs', 'like', "%{$q}%")
                    ->orWhere('nombre_tecnico', 'like', "%{$q}%")
                    ->orWhere('cedula_tecnico', 'like', "%{$q}%")
                    ->orWhere('municipio', 'like', "%{$q}%")
                    ->orWhere('descripcion', 'like', "%{$q}%");
            });
        }
        if ($request->estado) {
            $query->where('estado', $request->estado);
        }
        if ($request->proveedor) {
            $query->where('proveedor', $request->proveedor);
        }
        if ($request->fecha_desde) {
            $query->whereDate('fecha_estado', '>=', $request->fecha_desde);
        }
        if ($request->fecha_hasta) {
            $query->whereDate('fecha_estado', '<=', $request->fecha_hasta);
        }
        if (in_array($request->tipo_tecnico, ['directo', 'indirecto'], true)) {
            $this->filtrarPorTipoDeTecnico($query, $request->tipo_tecnico);
        }

        return $query;
    }

    // Misma regla de aplicarEstadoPorTecnico: manda el usuario de la cédula; sin usuario, la MODALIDAD del archivo.
    private function filtrarPorTipoDeTecnico($query, string $tipo): void
    {
        // En SQL crudo Laravel no agrega el prefijo de tablas (`erp_` en producción).
        $prefijo = DB::getTablePrefix();
        $wo = "{$prefijo}work_orders";

        $usuarioDeLaWo = fn ($q) => $q->selectRaw('1')->from('users')
            ->where('users.cedula', '!=', '')
            ->whereRaw("{$prefijo}users.cedula = COALESCE(NULLIF({$wo}.cedula_tecnico_agendado, ''), {$wo}.cedula_tecnico)");

        $query->where(function ($w) use ($usuarioDeLaWo, $tipo, $wo) {
            $w->whereExists(function ($q) use ($usuarioDeLaWo, $tipo) {
                $usuarioDeLaWo($q);
                $tipo === 'indirecto' ? $q->whereNotNull('users.aliado_id') : $q->whereNull('users.aliado_id');
            })->orWhere(function ($sinUsuario) use ($usuarioDeLaWo, $tipo, $wo) {
                $sinUsuario->whereNotExists($usuarioDeLaWo)
                    ->whereRaw("UPPER(TRIM({$wo}.modalidad)) = ?", [$tipo === 'indirecto' ? 'ALIADO' : 'DIRECTO']);
            });
        });
    }

    public function destroy(Request $request, WorkOrder $workOrder)
    {
        $this->soloLasQueVe($request, $workOrder);
        $workOrder->delete();

        return response()->json(null, 204);
    }

    /**
     * Cambia el estado de una WO. Quién puede, lo decide la matriz de Permisos (Editar en
     * Work Orders, por rol o perfil de aliado); un técnico o un aliado solo toca las que ya
     * puede ver (ver visibles()). Cuando la cierra un técnico queda registrado en `*_cierre` para el exporte
     * (ver conDatosDelTecnico, columna "Técnico Atiende"); si la cambia otro rol admin/
     * operaciones no se toca, porque ese cambio no es un técnico cerrando su WO. Si el nuevo
     * estado es "Finalizado" también se pone `fecha_finalizacion` (antes solo quedaba la de
     * las WO que ya llegaban finalizadas por el import).
     */
    public function update(Request $request, WorkOrder $workOrder)
    {
        $data = $request->validate([
            'estado'        => 'required|string|max:60',
            'modo_atencion' => 'nullable|in:' . self::SOLO . ',' . self::ACOMPANADO,
            'auxiliar_id'   => 'nullable|integer',
        ]);
        $user = $request->user();

        $this->soloLasQueVe($request, $workOrder);

        // Al finalizar la WO de un directo se registra si atendió solo o con qué auxiliar técnico.
        $esDirecto = $this->tipoDeTecnico($workOrder, $this->tecnicosDe(collect([$workOrder]))) === 'DIRECTO';
        if ($data['estado'] === 'Finalizado' && $esDirecto) {
            $modo = $data['modo_atencion'] ?? null;
            if (!$modo) {
                throw ValidationException::withMessages(['modo_atencion' => 'Indica si el técnico atendió SOLO o ACOMPAÑADO.']);
            }
            $auxiliar = $modo === self::ACOMPANADO
                ? $this->auxiliaresTecnicos()->firstWhere('id', (int) ($data['auxiliar_id'] ?? 0))
                : null;
            if ($modo === self::ACOMPANADO && !$auxiliar) {
                throw ValidationException::withMessages(['auxiliar_id' => 'Selecciona el auxiliar técnico que lo acompañó.']);
            }
            $workOrder->modo_atencion = $modo;
            $workOrder->auxiliar = $auxiliar['nombre'] ?? null;
        }

        if ($user->rol === 'tecnico') {
            $workOrder->nombre_tecnico_cierre = $user->name;
            $workOrder->cedula_tecnico_cierre = $user->cedula;
        }

        $workOrder->estado = $data['estado'];
        $workOrder->fecha_estado = now();
        if ($data['estado'] === 'Finalizado') {
            $workOrder->fecha_finalizacion = now();
        }
        $workOrder->save();

        return response()->json($workOrder);
    }

    /** Auxiliares técnicos que pueden acompañar a un directo (empleados activos con ese cargo). */
    public function auxiliares()
    {
        return response()->json($this->auxiliaresTecnicos());
    }

    private function auxiliaresTecnicos()
    {
        return User::where('activo', true)->whereNotNull('cargo')->orderBy('name')->get(['id', 'name', 'cargo'])
            ->filter(function (User $u) {
                $cargo = mb_strtoupper(Str::ascii((string) $u->cargo), 'UTF-8');
                return str_contains($cargo, 'AUXILIAR TECNICO') || str_contains($cargo, 'TECNICO AUXILIAR') || str_contains($cargo, '(AUX)');
            })
            ->map(fn (User $u) => ['id' => $u->id, 'nombre' => $u->name])
            ->values();
    }

    /**
     * Importa/actualiza en bloque desde el Excel de origen: el frontend ya convirtió el
     * archivo a filas planas por nombre de columna, aquí solo se resuelven fechas
     * (tolerante: una fecha ilegible no bota la fila entera, solo esa columna queda null)
     * y se hace upsert por el PAR `numero_wo` + `numero_item` (un mismo WO trae varias filas
     * en el archivo, una por cada ítem/material) para poder reimportar el mismo archivo
     * actualizado sin duplicar filas.
     *
     * Actualización PARCIAL: una columna que no viene en la fila (no existe la llave en el
     * array, no que venga vacía) no se toca si la WO ya existía — así un archivo que solo
     * trae numero_wo + nombre_tecnico, por ejemplo, solo cambia ese dato y conserva el resto.
     * Si la columna sí viene pero vacía, se interpreta como borrado explícito de ese campo.
     *
     * Si la fila tampoco trae numero_item (import parcial, sin desglose por ítem), el match
     * para actualizar se hace solo por numero_wo, sobre TODAS las filas que ya existan con
     * ese WO (y si no existe ninguna, se crea una con numero_item vacío).
     */
    public function importar(Request $request)
    {
        $request->validate([
            'items'              => 'required|array|min:1',
            'items.*.numero_wo'  => 'required|string|max:60',
        ]);

        // OJO: se usa $request->input('items'), NO el array devuelto por validate(). Como las
        // reglas de arriba solo declaran 'numero_wo', $request->validate() recorta cada fila
        // dejando ÚNICAMENTE ese campo y descarta el resto en silencio (sin error) — así fue
        // como una importación "exitosa" terminaba guardando todo vacío menos el WO.
        $items = $request->input('items');

        $camposFecha = [
            'fecha_estado', 'fecha_creacion', 'fecha_vencimiento', 'fecha_finalizacion',
            'fecha_programacion', 'fecha_publicacion', 'fecha_cancelacion', 'fecha_pago',
            'fecha_registro_material', 'fecha_registro_sin_material',
            'estado_en_fecha', 'fecha_ultima_reasignacion',
        ];
        $camposEnteros = ['aging', 'dias_atraso', 'dias_atraso_sp', 'reiteracion_servicio'];
        $camposTexto = [
            'estado', 'servicio', 'subproducto', 'tipo_orden', 'tipo_producto', 'se_paga', 'consignada',
            'pago', 'prioridad', 'proveedor', 'cuadrilla_tecnico',
            'nombre_tecnico', 'tecnico_agendado', 'cedula_tecnico_agendado', 'cedula_tecnico',
            'modalidad', 'perimetro', 'perimetro_venta',
            'departamento', 'municipio', 'barrio', 'direccion', 'tel_casa', 'no_documento_cliente',
            'jornada', 'tecnologia', 'inicio_agendado', 'fin_agendado',
            'descripcion', 'region_servicio', 'categoria', 'problema', 'nombre_cliente', 'apellido_cliente',
            'estado_comercial', 'tipo_wo', 'tecnico_atendio_flag', 'wo_anterior', 'wo_fisica_ok', 'motivo',
            'consumio_material', 'paga_por_directv', 'comision_pagada', 'valor_comision', 'prueba_calidad',
            'numero_ticket_aprobacion', 'razon_prueba_calidad_fallida', 'contrato_enviado', 'registrado_por',
            'modo_atencion', 'auxiliar', 'torre', 'conductor', 'tipo_auxilio', 'auxilio', 'aplica_auxilio',
            'razon_cancelacion', 'observaciones_cancelacion',
            // Del "Excel de origen del proveedor" (segundo formato de import):
            'estado_descarga', 'estado_orden_trabajo', 'estado_visita', 'georreferencia',
            'nombre_cuadrilla_tecnico', 'apellido_cuadrilla_tecnico', 'cambio_domicilio_entre_calles',
            'pais', 'puntos_referencia', 'codigo_postal', 'agrupacion', 'telefono_principal', 'recursos',
            'numero_visita', 'coordenada_x', 'coordenada_y', 'razones', 'numero_orden_trabajo', 'codigo_sl',
            'clase_cliente', 'agendamiento_externo', 'descarga_materiales_obligatoria',
            'descarga_materiales_confirmada', 'id_encabezado_pedido',
        ];

        $filas = [];
        foreach ($items as $fila) {
            $tieneItem = array_key_exists('numero_item', $fila);

            $valores = [
                'numero_wo' => trim($fila['numero_wo']),
            ];
            if ($tieneItem) {
                // Vacío en vez de null: NULL no deduplica bien en el índice único de MySQL
                // (cada NULL cuenta como distinto), y la mayoría de WOs solo traen una fila.
                $valores['numero_item'] = trim((string) $fila['numero_item']);
            }

            if (array_key_exists('numero_wo_ibs', $fila)) {
                $valores['numero_wo_ibs'] = trim((string) $fila['numero_wo_ibs']) !== ''
                    ? trim((string) $fila['numero_wo_ibs'])
                    : null;
            }

            foreach ($camposTexto as $campo) {
                if (!array_key_exists($campo, $fila)) {
                    continue;
                }
                $valores[$campo] = trim((string) $fila[$campo]) !== '' ? trim((string) $fila[$campo]) : null;
            }
            // La cédula enlaza la WO con su técnico (y su aliado): igual que users.cedula.
            foreach (['cedula_tecnico', 'cedula_tecnico_agendado'] as $campo) {
                if (array_key_exists($campo, $valores)) {
                    $valores[$campo] = WorkOrder::normalizarCedula($valores[$campo]);
                }
            }
            foreach ($camposFecha as $campo) {
                if (!array_key_exists($campo, $fila)) {
                    continue;
                }
                $valores[$campo] = $this->parsearFecha($fila[$campo]);
            }
            foreach ($camposEnteros as $campo) {
                if (!array_key_exists($campo, $fila)) {
                    continue;
                }
                $valores[$campo] = is_numeric($fila[$campo]) ? (int) $fila[$campo] : null;
            }
            // Materiales del Exporte Macaw ({columna: cantidad}): solo los que traen dato. Si
            // el archivo no trae esas columnas no se manda la llave y se conservan los de antes.
            if (array_key_exists('materiales', $fila)) {
                $materiales = [];
                foreach ((array) $fila['materiales'] as $nombre => $cantidad) {
                    $cantidad = is_string($cantidad) ? trim($cantidad) : $cantidad;
                    if (is_string($nombre) && trim($nombre) !== '' && $cantidad !== null && $cantidad !== '' && (is_scalar($cantidad))) {
                        $materiales[mb_substr($nombre, 0, 120)] = is_numeric($cantidad) ? $cantidad + 0 : mb_substr((string) $cantidad, 0, 60);
                    }
                }
                $valores['materiales'] = $materiales ?: null;
            }

            $llaveStr = $valores['numero_wo'] . '|' . ($tieneItem ? $valores['numero_item'] : '');
            $filas[$llaveStr] = ['tiene_item' => $tieneItem, 'valores' => $valores];
        }

        $creadas = 0;
        $actualizadas = 0;
        $tecnicos = User::where('cedula', '!=', '')->pluck('aliado_id', 'cedula');

        DB::transaction(function () use ($filas, $tecnicos, &$creadas, &$actualizadas) {
            foreach ($filas as $entry) {
                $valores = $entry['valores'];

                if ($entry['tiene_item']) {
                    $llave = ['numero_wo' => $valores['numero_wo'], 'numero_item' => $valores['numero_item']];
                    $existente = WorkOrder::where($llave)->first();

                    if ($existente) {
                        // Solo se pisan los campos que vinieron en esta fila; lo que no se
                        // mandó conserva el valor que ya tenía la WO.
                        $existente->fill($valores);
                        $this->aplicarEstadoPorTecnico($existente, $tecnicos);
                        $existente->save();
                        $actualizadas++;
                    } else {
                        $nueva = new WorkOrder($valores);
                        $this->aplicarEstadoPorTecnico($nueva, $tecnicos);
                        $nueva->save();
                        $creadas++;
                    }
                    continue;
                }

                // Sin numero_item: se actualizan TODAS las filas que ya existan con ese WO.
                $existentes = WorkOrder::where('numero_wo', $valores['numero_wo'])->get();
                if ($existentes->isNotEmpty()) {
                    foreach ($existentes as $existente) {
                        $existente->fill($valores);
                        $this->aplicarEstadoPorTecnico($existente, $tecnicos);
                        $existente->save();
                    }
                    $actualizadas += $existentes->count();
                } else {
                    $nueva = new WorkOrder(array_merge($valores, ['numero_item' => '']));
                    $this->aplicarEstadoPorTecnico($nueva, $tecnicos);
                    $nueva->save();
                    $creadas++;
                }
            }
        });

        return response()->json(['creadas' => $creadas, 'actualizadas' => $actualizadas]);
    }

    // Un aliado no puede cambiar el estado: queda Finalizado. Un directo sí: queda Asignado, sin reabrir lo que ya avanzó.
    private function aplicarEstadoPorTecnico(WorkOrder $wo, $tecnicos): void
    {
        $tipo = $this->tipoDeTecnico($wo, $tecnicos);

        if ($tipo === 'ALIADO') {
            $wo->estado = 'Finalizado';
        } elseif ($tipo === 'DIRECTO') {
            $anterior = $wo->getOriginal('estado');
            $wo->estado = $anterior === 'Finalizado' ? $anterior : 'Asignado';
            // Reimportar no pisa lo que se registró al cerrarla (mes del auxilio, solo/acompañado).
            if ($anterior === 'Finalizado') {
                foreach (['fecha_finalizacion', 'modo_atencion', 'auxiliar'] as $campo) {
                    if ($wo->getOriginal($campo)) {
                        $wo->{$campo} = $wo->getOriginal($campo);
                    }
                }
            }
        }
    }

    // 'ALIADO', 'DIRECTO' o la MODALIDAD del archivo si la cédula no tiene usuario en el ERP.
    private function tipoDeTecnico(WorkOrder $wo, $tecnicos): string
    {
        $cedula = $wo->cedula_tecnico_agendado ?: $wo->cedula_tecnico;

        return $cedula && $tecnicos->has($cedula)
            ? ($tecnicos->get($cedula) ? 'ALIADO' : 'DIRECTO')
            : mb_strtoupper(trim((string) $wo->modalidad), 'UTF-8');
    }

    // aliado_id por cédula de los técnicos de esas WO, como lo espera tipoDeTecnico().
    private function tecnicosDe($workOrders)
    {
        $cedulas = $workOrders->flatMap(fn (WorkOrder $wo) => [$wo->cedula_tecnico_agendado, $wo->cedula_tecnico])->filter()->unique()->values();

        return User::whereIn('cedula', $cedulas)->where('cedula', '!=', '')->pluck('aliado_id', 'cedula');
    }

    private function parsearFecha($valor): ?string
    {
        if (!$valor || !trim((string) $valor)) {
            return null;
        }
        try {
            return Carbon::parse($valor)->format('Y-m-d H:i:s');
        } catch (\Throwable $e) {
            return null;
        }
    }
}
