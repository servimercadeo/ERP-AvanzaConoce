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
     * pasa si el rol del usuario tiene acceso a alguno de los módulo.submódulo dados.
     * Uso: ->middleware('permiso:administrativo.empleados,inventarios.dotacion')
     */
    public function handle(Request $request, Closure $next, string ...$destinos): Response
    {
        foreach ($destinos as $destino) {
            [$modulo, $submodulo] = array_pad(explode('.', $destino, 2), 2, PermisoDenegado::SUBMODULO_RAIZ);
            if (PermisoDenegado::permite($request->user(), $modulo, $submodulo)) {
                return $next($request);
            }
        }

        abort(403, 'No tienes permiso para acceder a este módulo.');
    }
}
