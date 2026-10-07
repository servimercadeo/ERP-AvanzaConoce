<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentoEmpleado;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Documentos del Empleado: carpeta por empleado para otrosí, certificados y demás
 * documentos ligados a un seguimiento de RH (cambio de cargo, cambio de salario,
 * acta de descargos, etc). Análogo a CandidatoDocumentoController pero no atado a un
 * solo nombre de documento por empleado: aquí se puede repetir el mismo nombre con
 * fechas/seguimientos distintos.
 */
class DocumentoEmpleadoController extends Controller
{
    public function index(Request $request)
    {
        $query = DocumentoEmpleado::with('empleado:id,name,nombres,apellidos,cedula')
            ->orderByDesc('fecha_seguimiento')
            ->orderByDesc('id');

        if ($request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id'             => 'required|exists:users,id',
            'nombre_documento'    => 'required|string|max:150',
            'nombre_seguimiento'  => 'required|string|max:150',
            'fecha_seguimiento'   => 'required|date',
            'responsable'         => 'required|string|max:100',
            'archivo'             => 'nullable|file|max:15360',
        ]);

        if ($request->hasFile('archivo')) {
            $file = $request->file('archivo');
            $data['ruta']            = $file->storeAs('documentos_empleado/' . $data['user_id'], Str::uuid() . '.' . $file->getClientOriginalExtension(), 'local');
            $data['nombre_original'] = $file->getClientOriginalName();
        }

        $doc = DocumentoEmpleado::create($data);
        $doc->load('empleado:id,name,nombres,apellidos,cedula');

        return response()->json($doc, 201);
    }

    public function update(Request $request, DocumentoEmpleado $documentoEmpleado)
    {
        $data = $request->validate([
            'user_id'             => 'required|exists:users,id',
            'nombre_documento'    => 'required|string|max:150',
            'nombre_seguimiento'  => 'required|string|max:150',
            'fecha_seguimiento'   => 'required|date',
            'responsable'         => 'required|string|max:100',
            'archivo'             => 'nullable|file|max:15360',
        ]);

        if ($request->hasFile('archivo')) {
            if ($documentoEmpleado->ruta) {
                Storage::disk('local')->delete($documentoEmpleado->ruta);
            }
            $file = $request->file('archivo');
            $data['ruta']            = $file->storeAs('documentos_empleado/' . $data['user_id'], Str::uuid() . '.' . $file->getClientOriginalExtension(), 'local');
            $data['nombre_original'] = $file->getClientOriginalName();
        }

        $documentoEmpleado->update($data);
        $documentoEmpleado->load('empleado:id,name,nombres,apellidos,cedula');

        return response()->json($documentoEmpleado);
    }

    public function destroy(DocumentoEmpleado $documentoEmpleado)
    {
        if ($documentoEmpleado->ruta) {
            Storage::disk('local')->delete($documentoEmpleado->ruta);
        }
        $documentoEmpleado->delete();

        return response()->json(null, 204);
    }

    public function download(DocumentoEmpleado $documentoEmpleado)
    {
        abort_unless($documentoEmpleado->ruta && Storage::disk('local')->exists($documentoEmpleado->ruta), 404);

        return response()->download(
            Storage::disk('local')->path($documentoEmpleado->ruta),
            $documentoEmpleado->nombre_original ?? 'documento'
        );
    }
}
