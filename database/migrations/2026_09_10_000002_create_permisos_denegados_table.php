<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lista de DENEGACIÓN (no de permiso) por rol: por defecto todo módulo/submódulo es
     * visible para cualquier rol; una fila aquí es la excepción explícita que lo oculta.
     * Así, activar este sistema no le quita ni le da acceso a nadie hasta que un admin
     * decida algo desde el módulo Permisos. "admin" no aparece nunca: siempre tiene
     * acceso total (bypass en el código), así nadie puede quedarse sin poder administrar
     * los permisos por accidente.
     *
     * `submodulo_id` usa el sentinel "_modulo" para representar los archivos que cuelgan
     * directo de un módulo (fuera de cualquier submódulo), como "Empleados" dentro de
     * "Administrativo".
     */
    public function up(): void
    {
        Schema::create('permisos_denegados', function (Blueprint $table) {
            $table->id();
            $table->enum('rol', ['gestor', 'consultor', 'th', 'tic']);
            $table->string('modulo_id', 60);
            $table->string('submodulo_id', 60);
            $table->timestamps();

            $table->unique(['rol', 'modulo_id', 'submodulo_id'], 'permisos_denegados_unico');
        });

        // Replica la única restricción que ya existía antes de este sistema (constante
        // MODULE_ROLES en resources/js/data/erpModules.js: "administrativo" solo para
        // admin/th/tic), para que nadie pierda ni gane acceso al migrar a este sistema.
        $now = now();
        $objetivos = ['seleccion', 'admin_contratos', '_modulo'];
        $rows = [];
        foreach (['gestor', 'consultor'] as $rol) {
            foreach ($objetivos as $submoduloId) {
                $rows[] = [
                    'rol' => $rol,
                    'modulo_id' => 'administrativo',
                    'submodulo_id' => $submoduloId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }
        DB::table('permisos_denegados')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('permisos_denegados');
    }
};
