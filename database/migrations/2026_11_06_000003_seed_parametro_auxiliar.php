<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Parametros > Operativos > Auxiliar: la lista que ofrece "Cambiar estado" cuando un
     * técnico directo finaliza la WO como ACOMPAÑADO (ver WorkOrderController::auxiliares).
     * Se siembra vacío: los auxiliares los agrega el usuario desde la pestaña.
     */
    private const TIPO = 'Auxiliar';

    private const GRUPO = 'Operativos';

    public function up(): void
    {
        if (DB::table('tipos_parametro')->where('nombre', self::TIPO)->exists()) {
            return;
        }

        DB::table('tipos_parametro')->insert([
            'nombre'     => self::TIPO,
            'grupo'      => self::GRUPO,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        $id = DB::table('tipos_parametro')->where('nombre', self::TIPO)->value('id');
        if (!$id) {
            return;
        }
        DB::table('valores_parametro')->where('tipo_parametro_id', $id)->delete();
        DB::table('tipos_parametro')->where('id', $id)->delete();
    }
};
