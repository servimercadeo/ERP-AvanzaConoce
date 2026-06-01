<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidato;
use App\Models\CandidatoDocumento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CandidatoDocumentoController extends Controller
{
    public function index(Candidato $candidato)
    {
        return response()->json($candidato->documentos()->orderBy('nombre')->get());
    }

    public function store(Request $request, Candidato $candidato)
    {
        $request->validate([
            'nombre'  => 'required|string|max:120',
            'archivo' => 'required|file|max:15360',
        ]);

        $file = $request->file('archivo');
        $ext  = $file->getClientOriginalExtension();
        $path = $file->storeAs(
            "candidatos/{$candidato->id}",
            Str::uuid() . '.' . $ext,
            'local'
        );

        // Si ya existe un documento con ese nombre para este candidato, reemplázalo
        $existing = $candidato->documentos()->where('nombre', $request->nombre)->first();
        if ($existing) {
            Storage::disk('local')->delete($existing->ruta);
            $existing->update(['ruta' => $path, 'nombre_original' => $file->getClientOriginalName()]);
            return response()->json($existing);
        }

        $doc = $candidato->documentos()->create([
            'nombre'          => $request->nombre,
            'ruta'            => $path,
            'nombre_original' => $file->getClientOriginalName(),
        ]);

        return response()->json($doc, 201);
    }

    public function download(Candidato $candidato, CandidatoDocumento $documento)
    {
        abort_if($documento->candidato_id !== $candidato->id, 404);
        abort_unless(Storage::disk('local')->exists($documento->ruta), 404);

        return response()->download(
            Storage::disk('local')->path($documento->ruta),
            $documento->nombre_original
        );
    }

    public function destroy(Candidato $candidato, CandidatoDocumento $documento)
    {
        abort_if($documento->candidato_id !== $candidato->id, 403);
        Storage::disk('local')->delete($documento->ruta);
        $documento->delete();
        return response()->json(null, 204);
    }
}
