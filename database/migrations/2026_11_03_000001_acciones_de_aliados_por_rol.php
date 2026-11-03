<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Operaciones > Aliados: de entrada solo el admin elimina, y solo el admin y Operaciones
     * editan (ahí se cambia el estado a Inactivo). A los demás roles se les habilita desde
     * Roles y permisos. Los perfiles de aliados ya los tienen negados desde
     * perfiles_de_permisos_de_aliados.
     */
    private const NEGADAS = [
        'eliminar' => ['th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general', 'tecnico'],
        'editar'   => ['th', 'tic', 'financiera', 'supervisores', 'general', 'tecnico'],
    ];

    private const DESTINO = ['modulo_id' => 'operaciones', 'submodulo_id' => 'aliados', 'archivo_id' => ''];

    public function up(): void
    {
        $now = now();
        foreach (self::NEGADAS as $accion => $roles) {
            foreach ($roles as $rol) {
                DB::table('permisos_denegados')->insertOrIgnore(self::DESTINO + [
                    'rol' => $rol, 'accion' => $accion, 'created_at' => $now, 'updated_at' => $now,
                ]);
            }
        }

        // Operaciones sí edita, aunque se le hubiera quitado en la matriz.
        DB::table('permisos_denegados')
            ->where(['rol' => 'operaciones', 'accion' => 'editar', 'modulo_id' => 'operaciones', 'submodulo_id' => 'aliados'])
            ->delete();
    }

    public function down(): void
    {
        foreach (self::NEGADAS as $accion => $roles) {
            DB::table('permisos_denegados')->where(self::DESTINO + ['accion' => $accion])->whereIn('rol', $roles)->delete();
        }
    }
};
