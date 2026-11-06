<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuxilioTramo;
use App\Services\AuxilioProductividad;
use Illuminate\Http\Request;

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
     * total y calcula el auxilio (cantidad × valor del tramo). La regla vive en
     * AuxilioProductividad, que es la misma que usa la columna "Auxilio" del exporte de
     * Work Orders. Un aliado nunca aparece aquí.
     */
    public function reporte(Request $request)
    {
        $mes = $request->mes ?: now()->format('Y-m');
        $tramos = AuxilioProductividad::tramos();
        $usuarios = AuxilioProductividad::usuariosPorCedula();

        $resultados = AuxilioProductividad::ordenesDelMes($mes, $usuarios)
            ->map(function ($ordenes, $cedula) use ($usuarios, $tramos) {
                $total = AuxilioProductividad::ordenesPagadas($ordenes);
                $tramo = AuxilioProductividad::tramoDe($total, $tramos);
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
