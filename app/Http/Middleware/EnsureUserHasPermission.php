<?php

namespace App\Http\Middleware;

use App\Models\PermisoDenegado;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasPermission
{
    /**
     * Restringe la ruta según la matriz del módulo Permisos (la misma que arma el menú):
     * pasa si el rol del usuario tiene acceso a alguno de los destinos dados, cada uno
     * "módulo.submódulo" o "módulo.submódulo.pestaña" (la pestaña que usa esa ruta), y
     * opcionalmente ":acción" (crear, editar, eliminar, importar, exportar) para pedir
     * además que esa acción no esté negada al rol en ese destino.
     * Uso: ->middleware('permiso:administrativo.seleccion.candidatos,inventarios.dotacion')
     *      ->middleware('permiso:administrativo.empleados:crear')
     */
    public function handle(Request $request, Closure $next, string ...$destinos): Response
    {
        $accion = PermisoDenegado::VER;
        foreach ($destinos as $destino) {
            [$ruta, $accion] = array_pad(explode(':', $destino, 2), 2, PermisoDenegado::VER);
            [$modulo, $submodulo, $archivo] = array_pad(explode('.', $ruta, 3), 3, null);
            if (PermisoDenegado::permite($request->user(), $modulo, $submodulo ?? PermisoDenegado::SUBMODULO_RAIZ, $archivo, $accion)) {
                return $next($request);
            }
        }

        abort(403, $accion === PermisoDenegado::VER
            ? 'No tienes permiso para acceder a este módulo.'
            : "No tienes permiso para {$accion} en este módulo.");
    }
}
