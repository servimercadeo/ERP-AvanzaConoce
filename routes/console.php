<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Reintento de empleados que no se pudieron crear en AvanzaConoce al darlos de alta
// (requiere en el servidor el cron de Laravel: * * * * * php82 artisan schedule:run).
\Illuminate\Support\Facades\Schedule::command('avanza:sincronizar-usuarios')
    ->everyTenMinutes()
    ->withoutOverlapping();
