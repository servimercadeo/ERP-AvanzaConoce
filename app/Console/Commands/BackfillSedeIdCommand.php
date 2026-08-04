<?php

namespace App\Console\Commands;

use App\Models\Sede;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Completa `sede_id` en contratos y users para registros existentes cuyo `sede` (texto libre)
 * ya coincide con el catálogo `sedes`, pero fueron guardados antes de que `sede_id` existiera
 * (por lo tanto nunca dispararon el hook de HasSedeCatalogo). Idempotente: solo toca filas con
 * sede_id nulo y sede no vacío.
 */
class BackfillSedeIdCommand extends Command
{
    protected $signature = 'sedes:backfill-ids {--dry-run : No persiste nada, solo muestra el resumen}';

    protected $description = 'Completa sede_id en contratos y users a partir del texto de sede existente';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $sedesPorNombre = Sede::pluck('id', 'nombre')
            ->mapWithKeys(fn ($id, $nombre) => [mb_strtoupper(trim($nombre), 'UTF-8') => $id]);

        $resumen = [];

        $work = function () use ($sedesPorNombre, &$resumen) {
            foreach (['contratos', 'users'] as $tabla) {
                $actualizados = 0;
                $sinCoincidencia = [];

                DB::table($tabla)
                    ->whereNull('sede_id')
                    ->whereNotNull('sede')
                    ->where('sede', '!=', '')
                    ->orderBy('id')
                    ->chunkById(200, function ($filas) use ($tabla, $sedesPorNombre, &$actualizados, &$sinCoincidencia) {
                        foreach ($filas as $fila) {
                            $clave = mb_strtoupper(trim($fila->sede), 'UTF-8');
                            $sedeId = $sedesPorNombre->get($clave);
                            if (!$sedeId) {
                                $sinCoincidencia[$fila->sede] = ($sinCoincidencia[$fila->sede] ?? 0) + 1;
                                continue;
                            }
                            DB::table($tabla)->where('id', $fila->id)->update(['sede_id' => $sedeId]);
                            $actualizados++;
                        }
                    });

                $resumen[$tabla] = ['actualizados' => $actualizados, 'sin_coincidencia' => $sinCoincidencia];
            }
        };

        if ($dryRun) {
            DB::beginTransaction();
            try {
                $work();
            } finally {
                DB::rollBack();
            }
        } else {
            DB::transaction($work);
        }

        $this->newLine();
        $this->info('=== Resumen ' . ($dryRun ? '(DRY RUN, nada se guardó) ' : '') . '===');
        foreach ($resumen as $tabla => $r) {
            $this->line("{$tabla}: actualizados {$r['actualizados']}");
            if ($r['sin_coincidencia']) {
                $this->warn("  Sedes sin coincidencia en el catálogo (" . count($r['sin_coincidencia']) . "):");
                foreach ($r['sin_coincidencia'] as $nombre => $cantidad) {
                    $this->line("    - \"{$nombre}\": {$cantidad} registro(s)");
                }
            }
        }

        return self::SUCCESS;
    }
}
