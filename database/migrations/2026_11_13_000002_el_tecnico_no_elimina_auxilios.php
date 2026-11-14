<?php

use App\Models\PermisoDenegado;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** El técnico entra a ver su propio auxilio: no configura escalas ni elimina auxilios. */
return new class extends Migration
{
    private const FILA = [
        'rol'          => 'tecnico',
        'modulo_id'    => 'operaciones',
        'submodulo_id' => 'auxilios',
        'archivo_id'   => PermisoDenegado::TODO_EL_SUBMODULO,
        'accion'       => 'eliminar',
    ];

    public function up(): void
    {
        if (!DB::table('permisos_denegados')->where(self::FILA)->exists()) {
            DB::table('permisos_denegados')->insert(self::FILA + ['created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        DB::table('permisos_denegados')->where(self::FILA)->delete();
    }
};
