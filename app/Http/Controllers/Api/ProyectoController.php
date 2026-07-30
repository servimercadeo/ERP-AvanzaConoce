<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Proyecto;
use Illuminate\Http\Request;

class ProyectoController extends Controller
{
    public function index(Request $request)
    {
        $query = Proyecto::query();

        if ($request->search) {
            $query->where('nombre', 'like', "%{$request->search}%");
        }

        return response()->json($query->orderBy('nombre')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:150|unique:proyectos,nombre',
            'activo' => 'boolean',
        ]);
        $data['activo'] = $data['activo'] ?? true;

        $proyecto = Proyecto::create($data);

        return response()->json($proyecto, 201);
    }

    public function show(Proyecto $proyecto)
    {
        return response()->json($proyecto);
    }

    public function update(Request $request, Proyecto $proyecto)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:150|unique:proyectos,nombre,' . $proyecto->id,
            'activo' => 'boolean',
        ]);

        $proyecto->update($data);

        return response()->json($proyecto->fresh());
    }

    public function destroy(Proyecto $proyecto)
    {
        // Ojo: requisiciones/cronograma_dotacion/proyecto_sede no tienen restricción de FK
        // (nullOnDelete/cascadeOnDelete), así que un delete directo no falla: silenciosamente
        // desvincula o borra en cascada esos registros. Hay que bloquearlo a mano.
        $enUso = $proyecto->requisiciones()->exists()
            || \Illuminate\Support\Facades\DB::table('proyecto_sede')->where('proyecto_id', $proyecto->id)->exists()
            || \Illuminate\Support\Facades\DB::table('cronograma_dotacion')->where('proyecto_id', $proyecto->id)->exists();

        if ($enUso) {
            return response()->json([
                'message' => 'No se puede eliminar: el proyecto está en uso (requisiciones, sedes o cronograma de dotación). Desactívalo en su lugar.',
            ], 422);
        }

        $proyecto->delete();

        return response()->json(null, 204);
    }
}
