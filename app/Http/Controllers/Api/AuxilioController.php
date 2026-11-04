<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuxilioTramo;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AuxilioController extends Controller
{
    public function tramos()
    {
        return response()->json(AuxilioTramo::orderBy('desde')->get());
    }

    public function storeTramo(Request $request)
    {
        $data = $request->validate([
            'desde'           => 'required|integer|min:0',
            'hasta'           => 'nullable|integer|gte:desde',
            'valor_por_orden' => 'required|integer|min:0',
        ]);

        return response()->json(AuxilioTramo::create($data), 201);
    }

    public function updateTramo(Request $request, AuxilioTramo $tramo)
    {
        $data = $request->validate([
            'desde'           => 'required|integer|min:0',
            'hasta'           => 'nullable|integer|gte:desde',
            'valor_por_orden' => 'required|integer|min:0',
        ]);
        $tramo->update($data);

        return response()->json($tramo);
    }

    public function destroyTramo(AuxilioTramo $tramo)
    {
        $tramo->delete();

        return response()->json(null, 204);
    }

    /**
     * Reporte de Auxilio por Productividad: por cada técnico DIRECTO con al menos una Work
     * Order finalizada en el mes, cuenta cuántas finalizó, ubica el tramo que alcanzó con ese
     * total y calcula el auxilio (cantidad × valor del tramo). Directo es igual que en
     * WorkOrderController::aplicarEstadoPorTecnico: usuario sin aliado_id o, si la cédula no
     * tiene usuario, MODALIDAD DIRECTO en el archivo. Un aliado nunca aparece aquí.
     */
    public function reporte(Request $request)
    {
        $mes = $request->mes ?: now()->format('Y-m');
        $inicio = Carbon::createFromFormat('Y-m', $mes)->startOfMonth();
        $fin = $inicio->copy()->endOfMonth();

        $tramos = AuxilioTramo::orderBy('desde')->get();
        $tramoDe = function (int $total) use ($tramos) {
            return $tramos->first(fn (AuxilioTramo $t) => $total >= $t->desde && ($t->hasta === null || $total <= $t->hasta));
        };

        $usuarios = User::where('cedula', '!=', '')->get(['cedula', 'name', 'aliado_id'])->keyBy('cedula');
        $cedulaDe = fn (WorkOrder $wo) => $wo->cedula_tecnico_cierre ?: $wo->cedula_tecnico_agendado ?: $wo->cedula_tecnico;
        $esDirecto = function (WorkOrder $wo) use ($usuarios, $cedulaDe) {
            $cedula = $cedulaDe($wo);
            if (!$cedula) {
                return false;
            }
            $usuario = $usuarios->get($cedula);

            return $usuario
                ? !$usuario->aliado_id
                : mb_strtoupper(trim((string) $wo->modalidad), 'UTF-8') === 'DIRECTO';
        };

        $resultados = WorkOrder::query()
            ->where('estado', 'Finalizado')
            ->whereBetween('fecha_finalizacion', [$inicio, $fin])
            ->get(['numero_wo', 'modalidad', 'cedula_tecnico_cierre', 'cedula_tecnico_agendado', 'cedula_tecnico', 'nombre_tecnico_cierre', 'tecnico_agendado', 'nombre_tecnico'])
            ->filter($esDirecto)
            ->groupBy($cedulaDe)
            ->map(function ($ordenes, $cedula) use ($usuarios, $tramoDe) {
                // Un mismo WO trae una fila por ítem: se paga por orden, no por fila.
                $total = $ordenes->unique('numero_wo')->count();
                $tramo = $tramoDe($total);
                $wo = $ordenes->first();

                return [
                    'cedula'        => (string) $cedula,
                    'nombre'        => $usuarios->get($cedula)?->name ?: $wo->nombre_tecnico_cierre ?: $wo->tecnico_agendado ?: $wo->nombre_tecnico ?: (string) $cedula,
                    'total_wo'      => $total,
                    'tramo'         => $tramo,
                    'total_auxilio' => $tramo ? $total * $tramo->valor_por_orden : 0,
                ];
            });

        // El técnico solo ve su propio auxilio; el reporte completo es para los demás con permiso.
        if ($request->user()->rol === 'tecnico') {
            $resultados = $resultados->filter(fn ($r) => $r['cedula'] === (string) $request->user()->cedula);
        }

        if ($request->search) {
            $q = mb_strtolower($request->search, 'UTF-8');
            $resultados = $resultados->filter(fn ($r) => str_contains(mb_strtolower($r['nombre'], 'UTF-8'), $q) || str_contains($r['cedula'], $q));
        }

        return response()->json([
            'mes'        => $mes,
            'tramos'     => $tramos,
            'resultados' => $resultados->sortBy('nombre')->values(),
        ]);
    }
}
