<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Vehiculo;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class WorkOrderController extends Controller
{
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
            return response()->json($query->paginate(in_array($porPagina, [25, 50, 100], true) ? $porPagina : 50));
        }

        // Sin ?page=: lo usa el Exportar Excel, así que de una vez se completa con datos del
        // técnico que la WO no trae (sede, vinculación, supervisor, aliado, vehículo
        // asignado) en vez de dejarlos como "N/D" pudiéndolos sacar de su ficha.
        return response()->json($this->conDatosDelTecnico($query->get()));
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
        if ($cedulas->isEmpty()) {
            return $workOrders;
        }

        $tecnicos = User::whereIn('cedula', $cedulas)
            ->with('aliado:id,nombre')
            ->get(['id', 'cedula', 'sede', 'tipo_vinculacion', 'jefe_inmediato', 'aliado_id'])
            ->keyBy('cedula');

        $vehiculosPorTecnico = Vehiculo::whereIn('tecnico_asignado_id', $tecnicos->pluck('id')->filter())
            ->get(['placa', 'tecnico_asignado_id'])
            ->keyBy('tecnico_asignado_id');

        return $workOrders->map(function (WorkOrder $wo) use ($tecnicos, $vehiculosPorTecnico, $cedulaAsignado) {
            $tecnico = $tecnicos->get($cedulaAsignado($wo));
            $wo->sede_tecnico = $tecnico?->sede;
            $wo->tipo_vinculacion_tecnico = $tecnico?->tipo_vinculacion;
            $wo->supervisor_tecnico = $tecnico?->jefe_inmediato;
            // "NA" (no "N/D"): si el técnico existe, SÍ sabemos si tiene aliado o no; "N/D"
            // es solo para lo que el sistema no puede saber en absoluto.
            $wo->subagente_aliado_tecnico = $tecnico ? ($tecnico->aliado?->nombre ?? 'NA') : null;
            $wo->placa_vehiculo_tecnico = $tecnico ? $vehiculosPorTecnico->get($tecnico->id)?->placa : null;

            // "Técnico Atiende" del exporte: un técnico indirecto (aliado) no puede cerrar su
            // propia WO (ver update()), así que ahí se deja el mismo técnico agendado. Si es
            // directo (o no está registrado en el ERP), manda quien la haya cerrado de verdad
            // desde el sistema; si todavía nadie la cerró ahí (la mayoría: llegan ya cerradas
            // en el archivo del proveedor), se usa el "Técnico Atiende" que trajo el import.
            if ($tecnico && $tecnico->aliado_id) {
                $wo->nombre_tecnico_atiende = $wo->tecnico_agendado ?: $wo->nombre_tecnico;
                $wo->cedula_tecnico_atiende = $wo->cedula_tecnico_agendado ?: $wo->cedula_tecnico;
            } else {
                $wo->nombre_tecnico_atiende = $wo->nombre_tecnico_cierre ?: $wo->nombre_tecnico;
                $wo->cedula_tecnico_atiende = $wo->cedula_tecnico_cierre ?: $wo->cedula_tecnico;
            }

            return $wo;
        });
    }

    /** Total y opciones de los filtros (estados, proveedores) sin descargar las WOs. */
    public function resumen(Request $request)
    {
        $distintos = fn (string $columna) => $this->visibles($request)
            ->whereNotNull($columna)->where($columna, '!=', '')
            ->distinct()->orderBy($columna)->pluck($columna);

        return response()->json([
            'total'       => $this->visibles($request)->count(),
            'estados'     => $distintos('estado'),
            'proveedores' => $distintos('proveedor'),
        ]);
    }

    /** Las WOs que este usuario puede ver. */
    private function visibles(Request $request)
    {
        $query = WorkOrder::query();

        // El rol "tecnico" solo ve las work orders asignadas a su propia cédula; el resto
        // de roles con acceso al submódulo (operaciones, admin, etc.) las ve todas. Sin
        // cédula registrada no ve ninguna (nunca todas por descarte de "IS NULL").
        if ($request->user()?->rol === 'tecnico') {
            $query->where('cedula_tecnico', $request->user()->cedula ?? '__sin_cedula__');
        }

        return $query;
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

        return $query;
    }

    public function destroy(WorkOrder $workOrder)
    {
        $workOrder->delete();

        return response()->json(null, 204);
    }

    /**
     * Cambia el estado de una WO. El rol "tecnico" solo puede tocar las que ya puede ver
     * (las de su propia cédula, ver visibles()) y únicamente si es directo: un indirecto
     * (aliado — tiene `aliado_id`) no puede cambiar el estado de su Work Order, solo verla.
     * Cuando la cierra un técnico (directo) queda registrado en `*_cierre` para el exporte
     * (ver conDatosDelTecnico, columna "Técnico Atiende"); si la cambia otro rol admin/
     * operaciones no se toca, porque ese cambio no es un técnico cerrando su WO. Si el nuevo
     * estado es "Finalizado" también se pone `fecha_finalizacion` (antes solo quedaba la de
     * las WO que ya llegaban finalizadas por el import).
     */
    public function update(Request $request, WorkOrder $workOrder)
    {
        $data = $request->validate(['estado' => 'required|string|max:60']);
        $user = $request->user();

        if ($user->rol === 'tecnico') {
            abort_unless($this->visibles($request)->whereKey($workOrder->id)->exists(), 404);
            abort_if($user->aliado_id, 403, 'Los técnicos aliados (indirectos) no pueden cambiar el estado de la Work Order.');

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

            $llaveStr = $valores['numero_wo'] . '|' . ($tieneItem ? $valores['numero_item'] : '');
            $filas[$llaveStr] = ['tiene_item' => $tieneItem, 'valores' => $valores];
        }

        $creadas = 0;
        $actualizadas = 0;

        DB::transaction(function () use ($filas, &$creadas, &$actualizadas) {
            foreach ($filas as $entry) {
                $valores = $entry['valores'];

                if ($entry['tiene_item']) {
                    $llave = ['numero_wo' => $valores['numero_wo'], 'numero_item' => $valores['numero_item']];
                    $existente = WorkOrder::where($llave)->first();

                    if ($existente) {
                        // Solo se pisan los campos que vinieron en esta fila; lo que no se
                        // mandó conserva el valor que ya tenía la WO.
                        $existente->fill($valores);
                        $existente->save();
                        $actualizadas++;
                    } else {
                        WorkOrder::create($valores);
                        $creadas++;
                    }
                    continue;
                }

                // Sin numero_item: se actualizan TODAS las filas que ya existan con ese WO.
                $existentes = WorkOrder::where('numero_wo', $valores['numero_wo'])->get();
                if ($existentes->isNotEmpty()) {
                    foreach ($existentes as $existente) {
                        $existente->fill($valores);
                        $existente->save();
                    }
                    $actualizadas += $existentes->count();
                } else {
                    WorkOrder::create(array_merge($valores, ['numero_item' => '']));
                    $creadas++;
                }
            }
        });

        return response()->json(['creadas' => $creadas, 'actualizadas' => $actualizadas]);
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
