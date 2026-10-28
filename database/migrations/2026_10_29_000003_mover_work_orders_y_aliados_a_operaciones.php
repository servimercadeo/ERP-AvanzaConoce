<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Work Orders y Aliados salen de Inventarios hacia el nuevo módulo Operaciones. Los
     * submódulos conservan su id, así que basta con cambiar el modulo_id de las filas de
     * `permisos_denegados` que ya tenían (ej. el técnico sin acceso a Aliados) para que la
     * matriz de Permisos siga igual.
     */
    private const SUBMODULOS = ['work_orders', 'aliados'];

    public function up(): void
    {
        $this->mover('inventarios', 'operaciones');
    }

    public function down(): void
    {
        $this->mover('operaciones', 'inventarios');
    }

    private function mover(string $desde, string $hacia): void
    {
        // Por si ya existiera la fila en el destino (índice único rol/módulo/submódulo/pestaña/acción).
        DB::table('permisos_denegados')
            ->where('modulo_id', $hacia)
            ->whereIn('submodulo_id', self::SUBMODULOS)
            ->delete();

        DB::table('permisos_denegados')
            ->where('modulo_id', $desde)
            ->whereIn('submodulo_id', self::SUBMODULOS)
            ->update(['modulo_id' => $hacia, 'updated_at' => now()]);
    }
};
