<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BaseIngreso;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class BaseIngresoController extends Controller
{
    private function resolveFromRequisicion(BaseIngreso $ingreso): BaseIngreso
    {
        $c = $ingreso->candidato;
        if (!$c) return $ingreso;

        $req = $c->requisicion;

        $ingreso->nombre_completo  = $c->nombres;
        $ingreso->telefono         = $c->celular;
        $ingreso->correo           = $c->correo;
        $ingreso->tipo_vinculacion = $c->tipo_vinculacion ?? $ingreso->tipo_vinculacion;
        $ingreso->cargo            = $req?->cargo?->nombre;
        $ingreso->empresa          = $req?->empresa?->nombre;
        $ingreso->proyecto         = $req?->proyecto?->nombre;
        $ingreso->lider_inmediato  = $req?->responsable;
        $ingreso->empleador        = $req?->empleador?->nombre;

        return $ingreso;
    }

    public function index(Request $request)
    {
        $query = BaseIngreso::with([
            'candidato.requisicion.cargo',
            'candidato.requisicion.proyecto',
            'candidato.requisicion.empresa',
            'candidato.requisicion.empleador',
        ]);

        if ($request->search) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nombre_completo', 'like', "%$s%")
                  ->orWhere('documento_identificacion', 'like', "%$s%")
                  ->orWhere('cargo', 'like', "%$s%");
            });
        }

        $ingresos = $query->orderBy('created_at', 'desc')->get();
        $ingresos->transform(fn($i) => $this->resolveFromRequisicion($i));

        return response()->json($ingresos);
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
        $ingreso->load([
            'candidato.requisicion.cargo',
            'candidato.requisicion.proyecto',
            'candidato.requisicion.empresa',
            'candidato.requisicion.empleador',
        ]);

        if ($ingreso->documento_identificacion) {
            app(\App\Services\EmpleadoSyncService::class)->syncToUser($ingreso->documento_identificacion, [
                'ingresos' => $ingreso->salario_basico,
                'movil'    => $ingreso->telefono,
                'email'    => $ingreso->correo,
                'cargo'    => $ingreso->cargo,
            ]);
        }

        return response()->json($this->resolveFromRequisicion($ingreso), 201);
    }

    public function show(BaseIngreso $baseIngreso)
    {
        $baseIngreso->load([
            'candidato.requisicion.cargo',
            'candidato.requisicion.proyecto',
            'candidato.requisicion.empresa',
            'candidato.requisicion.empleador',
        ]);

        return response()->json($this->resolveFromRequisicion($baseIngreso));
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
        $baseIngreso->load([
            'candidato.requisicion.cargo',
            'candidato.requisicion.proyecto',
            'candidato.requisicion.empresa',
            'candidato.requisicion.empleador',
        ]);

        if ($baseIngreso->documento_identificacion) {
            app(\App\Services\EmpleadoSyncService::class)->syncToUser($baseIngreso->documento_identificacion, [
                'ingresos' => $baseIngreso->salario_basico,
                'movil'    => $baseIngreso->telefono,
                'email'    => $baseIngreso->correo,
                'cargo'    => $baseIngreso->cargo,
            ]);
        }

        return response()->json($this->resolveFromRequisicion($baseIngreso));
    }

    public function destroy(BaseIngreso $baseIngreso)
    {
        // Desactivar aval del candidato vinculado para que sync no lo recree
        if ($baseIngreso->candidato_id) {
            \App\Models\Candidato::where('id', $baseIngreso->candidato_id)
                ->update(['aval' => false, 'fecha_aval' => null, 'tipo_vinculacion' => null, 'estado' => 'Entrevista']);
        }

        // Eliminar documentos locales y en SharePoint
        $cedula = $baseIngreso->documento_identificacion;
        if ($cedula) {
            // 1. Limpiar JSON y archivos físicos locales
            $metaPath = storage_path('app/documentos_contratacion.json');
            if (file_exists($metaPath)) {
                $meta = json_decode(file_get_contents($metaPath), true) ?: [];
                if (isset($meta[$cedula])) {
                    $dirSafe = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $cedula);
                    Storage::disk('local')->deleteDirectory("documentos_contratacion/{$dirSafe}");
                    unset($meta[$cedula]);
                    file_put_contents($metaPath, json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                }
            }

            // 2. Llamar al Flow de Power Automate para borrar la carpeta en SharePoint
            $flowUrl = config('services.sharepoint.delete_flow_url');
            if ($flowUrl) {
                try {
                    Http::timeout(10)->post($flowUrl, [
                        'cedula' => $cedula,
                        'nombre' => $baseIngreso->nombre_completo ?? '',
                    ]);
                } catch (\Exception $e) {
                    Log::warning('No se pudo eliminar carpeta en SharePoint para cédula ' . $cedula . ': ' . $e->getMessage());
                }
            }
        }

        $baseIngreso->forceDelete();
        return response()->json(null, 204);
    }

    public function sync()
    {
        $existingIds = BaseIngreso::whereNotNull('candidato_id')->pluck('candidato_id')->toArray();

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

        // Always refresh empresa/proyecto/cargo/empleador/lider from current requisicion
        $existingReq = BaseIngreso::whereNotNull('candidato_id')
            ->with(['candidato.requisicion.cargo', 'candidato.requisicion.proyecto', 'candidato.requisicion.empresa', 'candidato.requisicion.empleador'])
            ->get();

        foreach ($existingReq as $ingreso) {
            $c = $ingreso->candidato;
            if (!$c) continue;
            $req = $c->requisicion;
            $ingreso->update([
                'cargo'            => $req && $req->cargo     ? $req->cargo->nombre     : $ingreso->cargo,
                'empresa'          => $req && $req->empresa   ? $req->empresa->nombre   : $ingreso->empresa,
                'proyecto'         => $c->negocio ?: ($req && $req->proyecto ? $req->proyecto->nombre : $ingreso->proyecto),
                'lider_inmediato'  => $req ? ($req->responsable ?? $ingreso->lider_inmediato) : $ingreso->lider_inmediato,
                'empleador'        => $req && $req->empleador ? $req->empleador->nombre : $ingreso->empleador,
                'tipo_vinculacion' => $c->tipo_vinculacion    ?? $ingreso->tipo_vinculacion,
                'nombre_completo'  => $c->nombres             ?? $ingreso->nombre_completo,
                'telefono'         => $c->celular             ?? $ingreso->telefono,
                'correo'           => $c->correo              ?? $ingreso->correo,
            ]);
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
