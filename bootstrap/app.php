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
    })
    ->withCommands([
        \App\Console\Commands\ServeCommand::class,
    ])
    ->create();
