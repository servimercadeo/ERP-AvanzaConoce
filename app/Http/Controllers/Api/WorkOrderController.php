<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class WorkOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = WorkOrder::query();

        // El rol "tecnico" solo ve las work orders asignadas a su propia cédula; el resto
        // de roles con acceso al submódulo (operaciones, admin, etc.) las ve todas. Sin
        // cédula registrada no ve ninguna (nunca todas por descarte de "IS NULL").
        if ($request->user()?->rol === 'tecnico') {
            $query->where('cedula_tecnico', $request->user()->cedula ?? '__sin_cedula__');
        }

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

        return response()->json($query->orderByDesc('fecha_estado')->orderByDesc('id')->get());
    }

    public function destroy(WorkOrder $workOrder)
    {
        $workOrder->delete();

        return response()->json(null, 204);
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

        $camposFecha = ['fecha_estado', 'fecha_creacion', 'fecha_vencimiento', 'fecha_finalizacion'];
        $camposTexto = [
            'estado', 'servicio', 'tipo_orden', 'prioridad', 'proveedor', 'cuadrilla_tecnico',
            'nombre_tecnico', 'cedula_tecnico', 'modalidad', 'perimetro',
            'departamento', 'municipio', 'barrio', 'direccion', 'inicio_agendado', 'fin_agendado',
            'descripcion', 'region_servicio',
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
            foreach ($camposFecha as $campo) {
                if (!array_key_exists($campo, $fila)) {
                    continue;
                }
                $valores[$campo] = $this->parsearFecha($fila[$campo]);
            }
            if (array_key_exists('aging', $fila)) {
                $valores['aging'] = is_numeric($fila['aging']) ? (int) $fila['aging'] : null;
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
