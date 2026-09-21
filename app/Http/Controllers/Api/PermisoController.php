<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PermisoDenegado;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PermisoController extends Controller
{
    /**
     * Matriz completa (todas las filas, de todos los roles gestionables) para pintar el
     * módulo Permisos. Solo admin puede verla (ver routes/api.php).
     */
    public function index()
    {
        return response()->json(
            PermisoDenegado::all(['rol', 'modulo_id', 'submodulo_id'])
        );
    }

    /**
     * Reemplaza la matriz completa: se manda la lista final de lo que debe quedar
     * denegado (lo que no venga aquí, aunque antes estuviera denegado, vuelve a ser
     * visible). Mismo patrón de "borrar todo y recrear" que otros módulos del sistema.
     */
    public function sync(Request $request)
    {
        $data = $request->validate([
            'denegados'                 => 'array',
            'denegados.*.rol'           => 'required|string|in:' . implode(',', PermisoDenegado::ROLES_GESTIONABLES),
            'denegados.*.modulo_id'     => 'required|string|max:60',
            'denegados.*.submodulo_id'  => 'required|string|max:60',
        ]);

        $filas = collect($data['denegados'] ?? [])
            ->unique(fn ($d) => $d['rol'] . '|' . $d['modulo_id'] . '|' . $d['submodulo_id'])
            ->map(fn ($d) => [
                'rol'          => $d['rol'],
                'modulo_id'    => $d['modulo_id'],
                'submodulo_id' => $d['submodulo_id'],
                'created_at'   => now(),
                'updated_at'   => now(),
            ])
            ->values()
            ->all();

        DB::transaction(function () use ($filas) {
            PermisoDenegado::query()->delete();
            foreach (array_chunk($filas, 500) as $chunk) {
                PermisoDenegado::insert($chunk);
            }
        });

        return response()->json(
            PermisoDenegado::all(['rol', 'modulo_id', 'submodulo_id'])
        );
    }
}
