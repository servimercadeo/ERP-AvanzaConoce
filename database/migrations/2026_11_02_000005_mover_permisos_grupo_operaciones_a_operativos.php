<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // El id del grupo sale de su nombre: al renombrarlo, estas negaciones dejaron de aplicar.
    public function up(): void
    {
        $this->mover('paramgrupo_operaciones', 'paramgrupo_operativos');
    }

    public function down(): void
    {
        $this->mover('paramgrupo_operativos', 'paramgrupo_operaciones');
    }

    private function mover(string $desde, string $hacia): void
    {
        $origen = fn () => DB::table('permisos_denegados')->where('modulo_id', 'parametros')->where('submodulo_id', $desde);

        foreach ($origen()->get() as $fila) {
            // insertOrIgnore: la misma negación ya puede existir en el destino (índice único).
            DB::table('permisos_denegados')->insertOrIgnore([
                'rol' => $fila->rol, 'modulo_id' => $fila->modulo_id, 'submodulo_id' => $hacia,
                'archivo_id' => $fila->archivo_id, 'accion' => $fila->accion,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        $origen()->delete();
    }
};
