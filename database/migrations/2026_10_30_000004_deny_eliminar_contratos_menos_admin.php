<?php

use App\Models\PermisoDenegado;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * "Ver y Crear Contratos" ahora ofrece la acción Eliminar en la matriz de Permisos. Por
     * defecto solo el admin elimina contratos: se le niega a los demás roles, y desde la
     * matriz se le puede habilitar a quien corresponda. (Antes la ruta DELETE existía sin
     * botón y sin negaciones: cualquier rol con acceso a Contratos podía usarla.)
     */
    private const DESTINO = ['modulo_id' => 'administrativo', 'submodulo_id' => 'admin_contratos', 'archivo_id' => 'ver_crear_contratos', 'accion' => 'eliminar'];

    public function up(): void
    {
        $now = now();
        foreach (PermisoDenegado::ROLES_GESTIONABLES as $rol) {
            $fila = ['rol' => $rol] + self::DESTINO;
            if (!DB::table('permisos_denegados')->where($fila)->exists()) {
                DB::table('permisos_denegados')->insert($fila + ['created_at' => $now, 'updated_at' => $now]);
            }
        }
    }

    public function down(): void
    {
        DB::table('permisos_denegados')->where(self::DESTINO)->delete();
    }
};
