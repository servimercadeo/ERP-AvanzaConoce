<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Nuevo rol "tecnico": mismo tratamiento que operaciones/financiera/supervisores/general
     * (ver 2026_10_08_000002_seed_permisos_que_antes_imponia_el_rol.php) — por defecto ve
     * todo el ERP salvo Administrativo (empleados/selección/admin_contratos, reservado a
     * admin/th/tic) y Permisos (roles_permisos/auditoria, reservado a admin). Desde la
     * matriz de Permisos se le puede restringir el resto como a cualquier otro rol.
     */
    private const SUBMODULOS_ADMINISTRATIVO = ['empleados', 'seleccion', 'admin_contratos'];
    private const SUBMODULOS_PERMISOS = ['roles_permisos', 'auditoria'];

    public function up(): void
    {
        $prefix = DB::getTablePrefix();
        DB::statement("ALTER TABLE `{$prefix}users` MODIFY rol ENUM('admin', 'th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general', 'tecnico') NULL DEFAULT 'general'");
        DB::statement("ALTER TABLE `{$prefix}permisos_denegados` MODIFY rol ENUM('th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general', 'tecnico') NOT NULL");

        $now = now();
        $rows = [];
        $denegar = [
            'administrativo' => self::SUBMODULOS_ADMINISTRATIVO,
            'permisos'       => self::SUBMODULOS_PERMISOS,
        ];
        foreach ($denegar as $modulo => $submodulos) {
            foreach ($submodulos as $submodulo) {
                $existe = DB::table('permisos_denegados')
                    ->where(['rol' => 'tecnico', 'modulo_id' => $modulo, 'submodulo_id' => $submodulo])
                    ->exists();
                if (!$existe) {
                    $rows[] = ['rol' => 'tecnico', 'modulo_id' => $modulo, 'submodulo_id' => $submodulo, 'created_at' => $now, 'updated_at' => $now];
                }
            }
        }

        if ($rows) {
            DB::table('permisos_denegados')->insert($rows);
        }
    }

    public function down(): void
    {
        DB::table('permisos_denegados')->where('rol', 'tecnico')->delete();
        DB::table('users')->where('rol', 'tecnico')->update(['rol' => 'general']);

        $prefix = DB::getTablePrefix();
        DB::statement("ALTER TABLE `{$prefix}users` MODIFY rol ENUM('admin', 'th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general') NULL DEFAULT 'general'");
        DB::statement("ALTER TABLE `{$prefix}permisos_denegados` MODIFY rol ENUM('th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general') NOT NULL");
    }
};
