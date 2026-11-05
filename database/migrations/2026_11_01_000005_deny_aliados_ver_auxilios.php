<?php

use App\Models\PermisoDenegado;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Operaciones > Auxilios muestra el pago de TODOS los técnicos directos: igual que al
     * técnico (2026_10_30_000006), se les niega por defecto a los perfiles de aliados de la
     * matriz (2026_11_01_000004 se escribió antes de que existiera el submódulo). Desde la
     * matriz de Permisos se puede cambiar.
     */
    public function up(): void
    {
        foreach (PermisoDenegado::PERFILES_DE_ALIADOS as $perfil) {
            $fila = [
                'rol' => $perfil, 'modulo_id' => 'operaciones', 'submodulo_id' => 'auxilios',
                'archivo_id' => PermisoDenegado::TODO_EL_SUBMODULO, 'accion' => PermisoDenegado::VER,
            ];
            if (!DB::table('permisos_denegados')->where($fila)->exists()) {
                DB::table('permisos_denegados')->insert($fila + ['created_at' => now(), 'updated_at' => now()]);
            }
        }
    }

    public function down(): void
    {
        DB::table('permisos_denegados')->whereIn('rol', PermisoDenegado::PERFILES_DE_ALIADOS)
            ->where(['modulo_id' => 'operaciones', 'submodulo_id' => 'auxilios'])->delete();
    }
};
