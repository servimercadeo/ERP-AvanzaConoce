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
     * "módulo.submódulo" o "módulo.submódulo.pestaña" (la pestaña que usa esa ruta).
     * Uso: ->middleware('permiso:administrativo.seleccion.candidatos,inventarios.dotacion')
     */
    public function handle(Request $request, Closure $next, string ...$destinos): Response
    {
        foreach ($destinos as $destino) {
            [$modulo, $submodulo, $archivo] = array_pad(explode('.', $destino, 3), 3, null);
            if (PermisoDenegado::permite($request->user(), $modulo, $submodulo ?? PermisoDenegado::SUBMODULO_RAIZ, $archivo)) {
                return $next($request);
            }
        }

        abort(403, 'No tienes permiso para acceder a este módulo.');
    }
}
