<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureUserHasRole::class,
            // Acceso según la matriz del módulo Permisos (módulo.submódulo).
            'permiso' => \App\Http\Middleware\EnsureUserHasPermission::class,
            // Cierra la sesión de quien quedó inactivo mientras estaba conectado.
            'activo' => \App\Http\Middleware\EnsureUsuarioActivo::class,
            // El usuario de un aliado empresa solo llega a su ficha y sus Work Orders.
            'aliado.limitado' => \App\Http\Middleware\SoloAccesoDeAliado::class,
        ]);
        // El contenedor solo es alcanzable a través de Traefik (nunca directo desde
        // internet), así que confiar en cualquier origen es seguro aquí: sin esto, Laravel
        // no sabe que Traefik terminó la petición en HTTPS y genera URLs de assets con
        // http://, lo que el navegador bloquea como contenido mixto en la página https://.
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        });

        // Un dato que la base rechaza es un problema del dato, no un "Server Error" sin explicación.
        // El detalle técnico igual queda en el log (Laravel reporta antes de responder).
        $exceptions->render(function (\Illuminate\Database\QueryException $e, $request) {
            $mensaje = [
                1062 => 'Ya existe un registro con esos datos.',
                1048 => 'Falta un dato obligatorio.',
                1264 => 'Uno de los valores está fuera del rango permitido.',
                1366 => 'Uno de los datos tiene caracteres o un formato que no se pueden guardar.',
                1406 => 'Uno de los datos es demasiado largo.',
                1451 => 'No se puede eliminar: tiene registros relacionados.',
                1452 => 'Uno de los datos hace referencia a un registro que no existe.',
            ][$e->errorInfo[1] ?? null] ?? null;

            if ($mensaje && ($request->is('api/*') || $request->expectsJson())) {
                return response()->json(['message' => $mensaje], 422);
            }
        });
    })
    ->withCommands([
        \App\Console\Commands\ServeCommand::class,
    ])
    ->create();
