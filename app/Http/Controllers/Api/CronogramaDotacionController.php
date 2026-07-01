<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CronogramaDotacion;
use Illuminate\Http\Request;

class CronogramaDotacionController extends Controller
{
    public function index()
    {
        return response()->json(CronogramaDotacion::with('proyecto')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'proyecto_id'   => 'required|exists:proyectos,id',
            'fecha_entrega' => 'required|date',
            'ciclo_meses'   => 'nullable|integer|min:1|max:24',
        ]);
        $data['ciclo_meses'] = $data['ciclo_meses'] ?? 4;

        $entry = CronogramaDotacion::updateOrCreate(
            ['proyecto_id' => $data['proyecto_id']],
            $data
        );

        return response()->json($entry->load('proyecto'), 201);
    }

    public function update(Request $request, CronogramaDotacion $cronogramaDotacion)
    {
        $data = $request->validate([
            'fecha_entrega' => 'sometimes|date',
            'ciclo_meses'   => 'sometimes|integer|min:1|max:24',
        ]);

        $cronogramaDotacion->update($data);

        return response()->json($cronogramaDotacion->load('proyecto'));
    }

    public function toggle(CronogramaDotacion $cronogramaDotacion)
    {
        $cronogramaDotacion->update(['activo' => !$cronogramaDotacion->activo]);

        return response()->json($cronogramaDotacion->load('proyecto'));
    }

    public function destroy(CronogramaDotacion $cronogramaDotacion)
    {
        return response()->json(
            ['message' => 'Los cronogramas no se pueden eliminar. Use desactivar en su lugar.'],
            405
        );
    }
}
