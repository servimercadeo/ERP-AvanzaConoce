<?php

use App\Models\WorkOrder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Cédulas de técnico ya importadas con espacios, puntos, comas o ".0" ("108529382 6",
     * "1.085.293.826"): no enlazaban con su técnico ni su aliado. Se dejan como las guarda
     * ahora el importador (WorkOrder::normalizarCedula). Idempotente.
     */
    public function up(): void
    {
        foreach (['cedula_tecnico', 'cedula_tecnico_agendado'] as $columna) {
            $valores = DB::table('work_orders')
                ->whereNotNull($columna)
                ->where($columna, 'regexp', '[[:space:].,]')
                ->distinct()
                ->pluck($columna);

            foreach ($valores as $valor) {
                $limpio = WorkOrder::normalizarCedula($valor);
                if ($limpio !== $valor) {
                    DB::table('work_orders')->where($columna, $valor)->update([$columna => $limpio]);
                }
            }
        }
    }

    public function down(): void
    {
        // No se puede saber cómo venía escrita cada cédula: no se revierte.
    }
};
