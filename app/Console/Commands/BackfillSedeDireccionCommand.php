<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BackfillSedeDireccionCommand extends Command
{
    protected $signature = 'sedes:backfill-direccion {--apply : Aplica los cambios; sin esta bandera solo se muestra un reporte}';

    protected $description = 'Llena el campo direccion de las sedes quitando el prefijo de marca del nombre (ej. "TIGO EXPRESS ARJONA 51 48 CLL DEL COCO" -> "ARJONA 51 48 CLL DEL COCO")';

    private const PREFIJOS = [
        'TIGO EXPRESS ',
        'TIGO HOME ',
        'SERVIMERCADEO ',
        'SYM ',
    ];

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');

        $sedes = DB::table('sedes')
            ->where(function ($q) {
                $q->whereNull('direccion')->orWhere('direccion', '');
            })
            ->select('id', 'nombre')
            ->get();

        $asignadas = 0;
        $sinPrefijo = [];

        foreach ($sedes as $sede) {
            $prefijo = collect(self::PREFIJOS)->first(
                fn ($p) => stripos($sede->nombre, $p) === 0
            );

            if (!$prefijo) {
                $sinPrefijo[] = $sede->nombre;
                continue;
            }

            $direccion = trim(substr($sede->nombre, strlen($prefijo)));
            $direccion = preg_replace('/\s+/', ' ', $direccion);

            if ($direccion === '') {
                $sinPrefijo[] = $sede->nombre . ' (nada después del prefijo)';
                continue;
            }

            $this->line("{$sede->nombre} -> {$direccion}");

            if ($apply) {
                DB::table('sedes')->where('id', $sede->id)->update(['direccion' => $direccion]);
            }

            $asignadas++;
        }

        $this->newLine();
        $this->info("Sedes actualizadas: {$asignadas}" . ($apply ? ' (aplicado)' : ' (modo reporte, no se guardó nada — usa --apply)'));
        if ($sinPrefijo) {
            $this->warn('Sedes sin prefijo reconocido (' . count($sinPrefijo) . '):');
            foreach ($sinPrefijo as $n) {
                $this->line("  - {$n}");
            }
        }

        return self::SUCCESS;
    }
}
