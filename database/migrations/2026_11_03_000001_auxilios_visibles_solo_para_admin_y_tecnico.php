<?php

use App\Models\PermisoDenegado;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const SUBMODULO = ['modulo_id' => 'operaciones', 'submodulo_id' => 'auxilios'];

    private const VER_TODO = ['archivo_id' => PermisoDenegado::TODO_EL_SUBMODULO, 'accion' => PermisoDenegado::VER];

    private const EDITAR_ESCALAS = ['archivo_id' => 'auxilios_file', 'accion' => 'editar'];

    // El técnico entra a ver solo su auxilio (AuxilioController::reporte), sin tocar las escalas; el resto de roles deja de verlo.
    public function up(): void
    {
        DB::table('permisos_denegados')->where(['rol' => 'tecnico'] + self::SUBMODULO + self::VER_TODO)->delete();
        $this->negar('tecnico', self::EDITAR_ESCALAS);

        foreach ($this->otrosRoles() as $rol) {
            $this->negar($rol, self::VER_TODO);
        }
    }

    public function down(): void
    {
        DB::table('permisos_denegados')->where(['rol' => 'tecnico'] + self::SUBMODULO + self::EDITAR_ESCALAS)->delete();
        DB::table('permisos_denegados')->where(self::SUBMODULO + self::VER_TODO)->whereIn('rol', $this->otrosRoles())->delete();
        $this->negar('tecnico', self::VER_TODO);
    }

    private function otrosRoles(): array
    {
        return array_values(array_diff(PermisoDenegado::ROLES_GESTIONABLES, ['tecnico']));
    }

    private function negar(string $rol, array $destino): void
    {
        $fila = ['rol' => $rol] + self::SUBMODULO + $destino;
        if (!DB::table('permisos_denegados')->where($fila)->exists()) {
            DB::table('permisos_denegados')->insert($fila + ['created_at' => now(), 'updated_at' => now()]);
        }
    }
};
