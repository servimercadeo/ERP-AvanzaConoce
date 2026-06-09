<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BaseIngreso;
use Illuminate\Http\Request;

class BaseIngresoController extends Controller
{
    public function index(Request $request)
    {
        $query = BaseIngreso::with('candidato');

        if ($request->search) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nombre_completo', 'like', "%$s%")
                  ->orWhere('documento_identificacion', 'like', "%$s%")
                  ->orWhere('cargo', 'like', "%$s%");
            });
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'candidato_id'               => 'nullable|exists:candidatos,id',
            'fecha_aval'                 => 'nullable|date',
            'documento_identificacion'   => 'required|string|max:30',
            'nombre_completo'            => 'required|string|max:200',
            'cargo'                      => 'nullable|string|max:150',
            'ciudad'                     => 'nullable|string|max:120',
            'empresa'                    => 'nullable|string|max:150',
            'proyecto'                   => 'nullable|string|max:150',
            'telefono'                   => 'nullable|string|max:20',
            'correo'                     => 'nullable|email|max:180',
            'tipo_vinculacion'           => 'nullable|string|in:Directa,Indirecta',
            'lugar_trabajo'              => 'nullable|string|max:150',
            'lider_inmediato'            => 'nullable|string|max:150',
            'empleador'                  => 'nullable|string|max:150',
            'fecha_programacion_ingreso' => 'nullable|date',
            'fecha_correccion'           => 'nullable|date',
            'tasa_riesgo_arl'            => 'nullable|string|max:10',
            'salario_basico'             => 'nullable|numeric|min:0',
            'auxilio_transporte'         => 'nullable|numeric|min:0',
            'otrosi_variable'            => 'nullable|numeric|min:0',
            'auxilio_rodamiento'         => 'nullable|numeric|min:0',
            'auxilio_comunicacion'       => 'nullable|numeric|min:0',
            'auxilio_alimentacion'       => 'nullable|numeric|min:0',
            'estado'                     => 'nullable|string|max:40',
        ]);

        $ingreso = BaseIngreso::create($data);
        return response()->json($ingreso->load('candidato'), 201);
    }

    public function show(BaseIngreso $baseIngreso)
    {
        return response()->json($baseIngreso->load('candidato'));
    }

    public function update(Request $request, BaseIngreso $baseIngreso)
    {
        $data = $request->validate([
            'candidato_id'               => 'nullable|exists:candidatos,id',
            'fecha_aval'                 => 'nullable|date',
            'documento_identificacion'   => 'sometimes|required|string|max:30',
            'nombre_completo'            => 'sometimes|required|string|max:200',
            'cargo'                      => 'nullable|string|max:150',
            'ciudad'                     => 'nullable|string|max:120',
            'empresa'                    => 'nullable|string|max:150',
            'proyecto'                   => 'nullable|string|max:150',
            'telefono'                   => 'nullable|string|max:20',
            'correo'                     => 'nullable|email|max:180',
            'tipo_vinculacion'           => 'nullable|string|in:Directa,Indirecta',
            'lugar_trabajo'              => 'nullable|string|max:150',
            'lider_inmediato'            => 'nullable|string|max:150',
            'empleador'                  => 'nullable|string|max:150',
            'fecha_programacion_ingreso' => 'nullable|date',
            'fecha_correccion'           => 'nullable|date',
            'tasa_riesgo_arl'            => 'nullable|string|max:10',
            'salario_basico'             => 'nullable|numeric|min:0',
            'auxilio_transporte'         => 'nullable|numeric|min:0',
            'otrosi_variable'            => 'nullable|numeric|min:0',
            'auxilio_rodamiento'         => 'nullable|numeric|min:0',
            'auxilio_comunicacion'       => 'nullable|numeric|min:0',
            'auxilio_alimentacion'       => 'nullable|numeric|min:0',
            'estado'                     => 'nullable|string|max:40',
        ]);

        $baseIngreso->update($data);
        return response()->json($baseIngreso->load('candidato'));
    }

    public function destroy(BaseIngreso $baseIngreso)
    {
        $baseIngreso->delete();
        return response()->json(null, 204);
    }

    public function sync(Request $request)
    {
        $existingIds = BaseIngreso::withTrashed()->whereNotNull('candidato_id')->pluck('candidato_id')->toArray();

        $candidatos = \App\Models\Candidato::with(['requisicion.cargo', 'requisicion.proyecto', 'requisicion.empresa', 'requisicion.empleador', 'ciudad'])
            ->where('pruebas', true)
            ->where('aval', true)
            ->whereNotIn('id', $existingIds)
            ->get();

        // Backfill salary fields for existing records that have null values
        $existing = BaseIngreso::whereNotNull('candidato_id')
            ->whereNull('salario_basico')
            ->with('candidato')
            ->get();

        foreach ($existing as $ingreso) {
            $c = $ingreso->candidato;
            if ($c) {
                $ingreso->update([
                    'tasa_riesgo_arl'    => $c->tasa_riesgo_arl,
                    'salario_basico'     => $c->salario_basico,
                    'auxilio_transporte' => $c->auxilio_transporte,
                    'otrosi_variable'    => $c->otrosi_variable,
                    'auxilio_rodamiento' => $c->auxilio_rodamiento,
                    'auxilio_comunicacion' => $c->auxilio_comunicacion,
                    'auxilio_alimentacion' => $c->auxilio_alimentacion,
                ]);
            }
        }

        // Backfill location/date fields for existing records that have null values
        $existingLocation = BaseIngreso::whereNotNull('candidato_id')
            ->where(function ($q) {
                $q->whereNull('lugar_trabajo')
                  ->orWhereNull('fecha_correccion')
                  ->orWhereNull('fecha_programacion_ingreso');
            })
            ->with('candidato')
            ->get();

        foreach ($existingLocation as $ingreso) {
            $c = $ingreso->candidato;
            if ($c) {
                $ingreso->update([
                    'lugar_trabajo'              => $ingreso->lugar_trabajo              ?? $c->lugar_trabajo,
                    'fecha_correccion'           => $ingreso->fecha_correccion           ?? $c->fecha_correccion,
                    'fecha_programacion_ingreso' => $ingreso->fecha_programacion_ingreso ?? $c->fecha_programacion_ingreso,
                ]);
            }
        }

        $count = 0;
        foreach ($candidatos as $c) {
            $req = $c->requisicion;
            BaseIngreso::create([
                'candidato_id'               => $c->id,
                'fecha_aval'                 => $c->fecha_aval,
                'documento_identificacion'   => $c->identificacion,
                'nombre_completo'            => $c->nombres,
                'cargo'                      => $req ? ($req->cargo ? $req->cargo->nombre : null) : null,
                'ciudad'                     => $c->ciudad ? $c->ciudad->nombre : ($req && $req->ciudad ? $req->ciudad->nombre : null),
                'empresa'                    => $req ? ($req->empresa ? $req->empresa->nombre : null) : null,
                'proyecto'                   => $c->negocio ?: ($req && $req->proyecto ? $req->proyecto->nombre : null),
                'telefono'                   => $c->celular,
                'correo'                     => $c->correo,
                'tipo_vinculacion'           => $c->tipo_vinculacion,
                'lugar_trabajo'              => $c->lugar_trabajo,
                'lider_inmediato'            => $req ? $req->responsable : null,
                'empleador'                  => $req ? ($req->empleador ? $req->empleador->nombre : null) : null,
                'fecha_programacion_ingreso' => $c->fecha_programacion_ingreso ?? now()->toDateString(),
                'fecha_correccion'           => $c->fecha_correccion,
                'estado'                     => 'activa',
                'tasa_riesgo_arl'            => $c->tasa_riesgo_arl,
                'salario_basico'             => $c->salario_basico,
                'auxilio_transporte'         => $c->auxilio_transporte,
                'otrosi_variable'            => $c->otrosi_variable,
                'auxilio_rodamiento'         => $c->auxilio_rodamiento,
                'auxilio_comunicacion'       => $c->auxilio_comunicacion,
                'auxilio_alimentacion'       => $c->auxilio_alimentacion,
            ]);
            $count++;
        }

        return response()->json(['message' => "Sincronización completa: $count registros agregados."]);
    }
}
