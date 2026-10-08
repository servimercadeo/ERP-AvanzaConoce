<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Las rutas de Administrativo (solo admin/th/tic) y de Permisos (solo admin) dejan de
     * tener el rol fijo en el código y pasan a la matriz del módulo Permisos. Para que al
     * desplegar nadie gane ni pierda acceso, se dejan denegados en la matriz los que el
     * rol fijo ya bloqueaba; desde ahí se activan o desactivan con los checks.
     */
    private const DENEGAR = [
        'administrativo' => [
            'roles'       => ['operaciones', 'financiera', 'supervisores', 'general'],
            'submodulos'  => ['empleados', 'seleccion', 'admin_contratos'],
        ],
        'permisos' => [
            'roles'       => ['th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general'],
            'submodulos'  => ['roles_permisos', 'auditoria'],
        ],
    ];

    public function up(): void
    {
        $now = now();
        $rows = [];
        foreach (self::DENEGAR as $modulo => $regla) {
            foreach ($regla['roles'] as $rol) {
                foreach ($regla['submodulos'] as $submodulo) {
                    $existe = DB::table('permisos_denegados')
                        ->where(['rol' => $rol, 'modulo_id' => $modulo, 'submodulo_id' => $submodulo])
                        ->exists();
                    if (!$existe) {
                        $rows[] = [
                            'rol' => $rol, 'modulo_id' => $modulo, 'submodulo_id' => $submodulo,
                            'created_at' => $now, 'updated_at' => $now,
                        ];
                    }
                }
            }
        }

        if ($rows) {
            DB::table('permisos_denegados')->insert($rows);
        }
    }

    public function down(): void
    {
        // No se revierte: borrar estas filas daría acceso a quien antes no lo tenía.
    }
};
