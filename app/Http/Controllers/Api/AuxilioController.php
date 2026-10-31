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
     * Reporte de Auxilio por Productividad: por cada técnico DIRECTO (sin aliado_id) con al
     * menos una Work Order finalizada en el mes, cuenta cuántas finalizó, ubica el tramo que
     * alcanzó con ese total y calcula el auxilio (cantidad × valor del tramo). Un técnico
     * indirecto (aliado) nunca aparece aquí: el auxilio es solo para directos.
     */
    public function reporte(Request $request)
    {
        $mes = $request->mes ?: now()->format('Y-m');
        $inicio = Carbon::createFromFormat('Y-m', $mes)->startOfMonth();
        $fin = $inicio->copy()->endOfMonth();

        $conteos = WorkOrder::query()
            ->selectRaw('COALESCE(cedula_tecnico_agendado, cedula_tecnico) as cedula, COUNT(*) as total')
            ->where('estado', 'Finalizado')
            ->whereBetween('fecha_finalizacion', [$inicio, $fin])
            ->whereRaw('COALESCE(cedula_tecnico_agendado, cedula_tecnico) IS NOT NULL')
            ->groupBy('cedula')
            ->get()
            ->keyBy('cedula');

        $tramos = AuxilioTramo::orderBy('desde')->get();
        $tramoDe = function (int $total) use ($tramos) {
            return $tramos->first(fn (AuxilioTramo $t) => $total >= $t->desde && ($t->hasta === null || $total <= $t->hasta));
        };

        $tecnicos = User::where('rol', 'tecnico')
            ->whereNull('aliado_id')
            ->whereIn('cedula', $conteos->keys())
            ->get(['cedula', 'name']);

        $resultados = $tecnicos->map(function (User $tecnico) use ($conteos, $tramoDe) {
            $total = (int) $conteos->get($tecnico->cedula)->total;
            $tramo = $tramoDe($total);

            return [
                'cedula'        => $tecnico->cedula,
                'nombre'        => $tecnico->name,
                'total_wo'      => $total,
                'tramo'         => $tramo,
                'total_auxilio' => $tramo ? $total * $tramo->valor_por_orden : 0,
            ];
        });

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
