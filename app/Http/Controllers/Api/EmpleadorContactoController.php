<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empleador;
use App\Models\EmpleadorContacto;
use App\Models\Regional;
use Illuminate\Http\Request;

class EmpleadorContactoController extends Controller
{
    public function store(Request $request, Empleador $empleador)
    {
        $data = $this->validarYResolverRegional($request);
        $data['empleador_id'] = $empleador->id;

        $contacto = EmpleadorContacto::create($data);

        return response()->json($contacto->load('regional'), 201);
    }

    public function update(Request $request, Empleador $empleador, EmpleadorContacto $contacto)
    {
        $data = $this->validarYResolverRegional($request);

        $contacto->update($data);

        return response()->json($contacto->fresh('regional'));
    }

    public function destroy(Empleador $empleador, EmpleadorContacto $contacto)
    {
        $contacto->delete();
        return response()->json(null, 204);
    }

    /**
     * "Regional" en el formulario es un selector con las regionales ya existentes en el
     * catálogo `regionales` (el mismo que usan Contratos/Pedidos), pero también admite texto
     * libre para dar de alta una nueva: si llega `regional_id` se usa tal cual, si llega
     * `regional_nombre` se busca/crea esa regional (mayúsculas) y se usa su id.
     */
    private function validarYResolverRegional(Request $request): array
    {
        $data = $request->validate([
            'nombre'          => 'required|string|max:150',
            'correo'          => 'required|email|max:150',
            'regional_id'     => 'nullable|integer|exists:regionales,id',
            'regional_nombre' => 'nullable|string|max:100',
        ]);

        if (empty($data['regional_id']) && empty($data['regional_nombre'])) {
            abort(422, 'Selecciona o escribe una regional.');
        }

        if (!empty($data['regional_id'])) {
            $regionalId = $data['regional_id'];
        } else {
            $nombre = mb_strtoupper(trim($data['regional_nombre']), 'UTF-8');
            $regionalId = Regional::firstOrCreate(['nombre' => $nombre])->id;
        }

        return [
            'nombre'      => $data['nombre'],
            'correo'      => $data['correo'],
            'regional_id' => $regionalId,
        ];
    }
}
