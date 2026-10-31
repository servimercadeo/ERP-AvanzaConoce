<?php

namespace App\Http\Middleware;

use App\Services\UsuarioAliadoEmpresa;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * El usuario de un aliado empresa (rol `aliado`) es externo: no basta con ocultarle el menú,
 * porque muchas rutas (catálogos, sedes, inventarios...) no llevan `permiso:`.
 *  - Las rutas con `permiso:` las decide su pestaña de la matriz de Permisos ("Aliado empresa").
 *  - Las que no lo llevan solo se le abren si están aquí: lo que usan su ficha de aliado y el
 *    armado del menú. Si en la matriz se le abre otro módulo que use una de esas rutas sin
 *    permiso, hay que agregarla aquí.
 * Los controladores además le limitan los datos a su aliado y sus técnicos. Para cualquier
 * otro usuario no hace nada.
 */
class SoloAccesoDeAliado
{
    /** Rutas sin `permiso:` que sí puede usar. Método => URIs de ruta (como en routes/api.php). */
    private const PERMITIDAS = [
        'GET' => [
            'api/user', 'api/user/preferences', 'api/aliados/proyectos',
            // El menú (useErpModules) arma submódulos con estos dos catálogos.
            'api/tipos-parametro', 'api/categorias-producto',
        ],
        'POST' => ['api/user/preferences'],
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->rol !== UsuarioAliadoEmpresa::ROL) {
            return $next($request);
        }

        $ruta = $request->route();
        $conPermiso = collect($ruta?->gatherMiddleware() ?? [])
            ->contains(fn ($m) => is_string($m) && str_starts_with($m, 'permiso:'));
        $metodo = $request->isMethod('HEAD') ? 'GET' : $request->method();

        abort_unless($conPermiso || in_array($ruta?->uri(), self::PERMITIDAS[$metodo] ?? [], true), 403, 'No tienes permiso para acceder a este módulo.');

        return $next($request);
    }
}
