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

        if ($request->search) {
            $q = $request->search;
            $query->where(function ($w) use ($q) {
                $w->where('numero_wo', 'like', "%{$q}%")
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
            $valores = [
                'numero_wo'   => trim($fila['numero_wo']),
                // Vacío en vez de null: NULL no deduplica bien en el índice único de MySQL
                // (cada NULL cuenta como distinto), y la mayoría de WOs solo traen una fila.
                'numero_item' => trim((string) ($fila['numero_item'] ?? '')),
            ];

            foreach ($camposTexto as $campo) {
                $valores[$campo] = isset($fila[$campo]) && trim((string) $fila[$campo]) !== ''
                    ? trim((string) $fila[$campo])
                    : null;
            }
            foreach ($camposFecha as $campo) {
                $valores[$campo] = $this->parsearFecha($fila[$campo] ?? null);
            }
            $valores['aging'] = isset($fila['aging']) && is_numeric($fila['aging']) ? (int) $fila['aging'] : null;

            $filas[$valores['numero_wo'] . '|' . $valores['numero_item']] = $valores;
        }

        $creadas = 0;
        $actualizadas = 0;

        DB::transaction(function () use ($filas, &$creadas, &$actualizadas) {
            foreach ($filas as $valores) {
                $llave = ['numero_wo' => $valores['numero_wo'], 'numero_item' => $valores['numero_item']];
                $existia = WorkOrder::where($llave)->exists();
                WorkOrder::updateOrCreate($llave, $valores);
                $existia ? $actualizadas++ : $creadas++;
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
