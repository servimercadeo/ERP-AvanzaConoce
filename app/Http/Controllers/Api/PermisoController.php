<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
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
            PermisoDenegado::all(['rol', 'modulo_id', 'submodulo_id', 'archivo_id'])
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
            // Vacío o ausente: todo el submódulo. Con valor: solo esa pestaña.
            'denegados.*.archivo_id'    => 'nullable|string|max:80',
        ]);

        $filas = collect($data['denegados'] ?? [])
            ->map(fn ($d) => [...$d, 'archivo_id' => (string) ($d['archivo_id'] ?? PermisoDenegado::TODO_EL_SUBMODULO)])
            ->unique(fn ($d) => $d['rol'] . '|' . $d['modulo_id'] . '|' . $d['submodulo_id'] . '|' . $d['archivo_id'])
            ->map(fn ($d) => [
                'rol'          => $d['rol'],
                'modulo_id'    => $d['modulo_id'],
                'submodulo_id' => $d['submodulo_id'],
                'archivo_id'   => $d['archivo_id'],
                'created_at'   => now(),
                'updated_at'   => now(),
            ])
            ->values()
            ->all();

        // PermisoDenegado::query()->delete() / ::insert() son operaciones en bloque: NO
        // disparan los eventos de Eloquent de los que vive RegistraAuditoria, así que un
        // cambio de permisos (algo sensible) quedaría sin rastro si no se deja esta fila
        // manual aquí.
        DB::transaction(function () use ($filas) {
            PermisoDenegado::query()->delete();
            foreach (array_chunk($filas, 500) as $chunk) {
                PermisoDenegado::insert($chunk);
            }
        });

        $user = $request->user();
        Auditoria::create([
            'user_id'     => $user?->id,
            'usuario'     => $user?->name ?? 'Sistema',
            'rol'         => $user?->rol,
            'accion'      => 'actualizado',
            'proceso'     => 'Permisos',
            'modelo'      => PermisoDenegado::class,
            'registro_id' => null,
            'descripcion' => 'Actualizó Permisos: sincronizó la matriz completa (' . count($filas) . ' denegaciones activas).',
            'created_at'  => now(),
        ]);

        return response()->json(
            PermisoDenegado::all(['rol', 'modulo_id', 'submodulo_id', 'archivo_id'])
        );
    }
}
