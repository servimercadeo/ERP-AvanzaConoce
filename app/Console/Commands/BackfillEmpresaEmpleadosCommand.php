<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Completa users.empresa_id para empleados que ya tienen contrato(s) pero cuyo usuario quedó
 * sin empresa asignada (bug de ImportarContratosActivosCommand antes de resolver empresa_id:
 * solo guardaba `contratos.empresa`, nunca tocaba `users.empresa_id`). Idempotente: solo toca
 * usuarios con empresa_id nulo, y solo si el `empresa` de su contrato más reciente coincide con
 * el catálogo `empresas`.
 */
class BackfillEmpresaEmpleadosCommand extends Command
{
    protected $signature = 'empleados:backfill-empresa {--dry-run : No persiste nada, solo muestra el resumen}';

    protected $description = 'Completa users.empresa_id a partir del contrato más reciente de cada empleado';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $empresasPorNombre = Empresa::pluck('id', 'nombre')
            ->mapWithKeys(fn ($id, $nombre) => [mb_strtoupper($nombre, 'UTF-8') => $id]);

        $usuarios = User::whereNull('empresa_id')
            ->whereHas('contratos')
            ->with(['contratos' => fn ($q) => $q->orderByDesc('fecha_ingreso')->orderByDesc('id')])
            ->get();

        $actualizados = 0;
        $sinCoincidencia = [];

        $work = function () use ($usuarios, $empresasPorNombre, &$actualizados, &$sinCoincidencia) {
            foreach ($usuarios as $user) {
                $empresaContrato = $user->contratos->first(fn ($c) => trim((string) $c->empresa) !== '')?->empresa;
                if (!$empresaContrato) {
                    continue;
                }

                $empresaId = $empresasPorNombre->get(mb_strtoupper(trim($empresaContrato), 'UTF-8'));
                if (!$empresaId) {
                    $sinCoincidencia[$empresaContrato] = ($sinCoincidencia[$empresaContrato] ?? 0) + 1;
                    continue;
                }

                $user->empresa_id = $empresaId;
                $user->save();
                $actualizados++;
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
        $this->line("Usuarios con contrato y empresa_id vacío revisados: {$usuarios->count()}");
        $this->line("Usuarios actualizados: {$actualizados}");

        if ($sinCoincidencia) {
            $this->newLine();
            $this->warn('Empresas del contrato sin coincidencia en el catálogo (' . count($sinCoincidencia) . '):');
            foreach ($sinCoincidencia as $nombre => $cantidad) {
                $this->line("  - \"{$nombre}\": {$cantidad} empleado(s)");
            }
        }

        return self::SUCCESS;
    }
}
