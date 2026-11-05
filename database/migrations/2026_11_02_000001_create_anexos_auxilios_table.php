<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Parámetros > Anexos y Auxilios: las opciones de "Anexo / Auxilio" del contrato, antes
     * fijas en el código. Arranca con las 8 de siempre. Los permisos de cada rol arrancan
     * como los que ya tiene en Parámetros > Proyectos (igual que se hizo con Cargos).
     */
    private const INICIALES = [
        'AUXILIO EXTRALEGAL DE RODAMIENTO',
        'AUXILIO EXTRALEGAL DE RODAMIENTO X W.O',
        'VARIABLE',
        'AUXILIO DE COMUNICACION',
        'AUXILIO DE HERRAMIENTA',
        'AUXILIO EXTRALEGAL DE CONECTIVIDAD',
        'COMISION FIJA',
        'BONO NO SALARIAL',
    ];

    public function up(): void
    {
        if (!Schema::hasTable('anexos_auxilios')) {
            Schema::create('anexos_auxilios', function (Blueprint $table) {
                $table->id();
                $table->string('nombre', 150)->unique();
                $table->timestamps();
            });
        }

        $now = now();
        foreach (self::INICIALES as $nombre) {
            if (!DB::table('anexos_auxilios')->where('nombre', $nombre)->exists()) {
                DB::table('anexos_auxilios')->insert(['nombre' => $nombre, 'created_at' => $now, 'updated_at' => $now]);
            }
        }

        $filas = DB::table('permisos_denegados')
            ->where('modulo_id', 'parametros')->where('submodulo_id', 'proyectos')
            ->get(['rol', 'archivo_id', 'accion']);
        foreach ($filas as $f) {
            $fila = [
                'rol'          => $f->rol,
                'modulo_id'    => 'parametros',
                'submodulo_id' => 'anexos_auxilios',
                'archivo_id'   => $f->archivo_id === 'proyectos_file' ? 'anexos_auxilios_file' : $f->archivo_id,
                'accion'       => $f->accion,
            ];
            if (!DB::table('permisos_denegados')->where($fila)->exists()) {
                DB::table('permisos_denegados')->insert($fila + ['created_at' => $now, 'updated_at' => $now]);
            }
        }
    }

    public function down(): void
    {
        DB::table('permisos_denegados')->where('modulo_id', 'parametros')->where('submodulo_id', 'anexos_auxilios')->delete();
        Schema::dropIfExists('anexos_auxilios');
    }
};
