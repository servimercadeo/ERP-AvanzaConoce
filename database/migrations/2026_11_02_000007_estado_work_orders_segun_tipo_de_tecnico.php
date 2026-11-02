<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Misma regla de WorkOrderController::aplicarEstadoPorTecnico, para lo que ya estaba importado.
    public function up(): void
    {
        $tecnicos = DB::table('users')->where('cedula', '!=', '')->pluck('aliado_id', 'cedula');

        DB::table('work_orders')
            ->select('id', 'estado', 'modalidad', 'cedula_tecnico', 'cedula_tecnico_agendado')
            ->orderBy('id')
            ->chunkById(500, function ($filas) use ($tecnicos) {
                $finalizar = [];
                $asignar = [];

                foreach ($filas as $wo) {
                    $cedula = $wo->cedula_tecnico_agendado ?: $wo->cedula_tecnico;
                    $tipo = $cedula && $tecnicos->has($cedula)
                        ? ($tecnicos->get($cedula) ? 'ALIADO' : 'DIRECTO')
                        : mb_strtoupper(trim((string) $wo->modalidad), 'UTF-8');

                    if ($tipo === 'ALIADO') {
                        $finalizar[] = $wo->id;
                    } elseif ($tipo === 'DIRECTO' && $wo->estado !== 'Finalizado') {
                        $asignar[] = $wo->id;
                    }
                }

                DB::table('work_orders')->whereIn('id', $finalizar)->update(['estado' => 'Finalizado', 'updated_at' => now()]);
                DB::table('work_orders')->whereIn('id', $asignar)->update(['estado' => 'Asignado', 'updated_at' => now()]);
            });
    }

    public function down(): void
    {
        // Sin vuelta atrás: el estado que traía el archivo no se conserva en otra columna.
    }
};
