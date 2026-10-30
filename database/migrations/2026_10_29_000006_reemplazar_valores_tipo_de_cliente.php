<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Los valores de "Tipo de Cliente" (Parámetros > Operaciones) se crearon con un ejemplo
     * genérico (Comercial, Distribuidor, Empleado, Pospago, Prepago) que no es el real: el
     * usuario mandó los 3 que de verdad se usan.
     */
    private const VIEJOS = ['Comercial', 'Distribuidor', 'Empleado', 'Pospago', 'Prepago'];
    private const NUEVOS = ['Normal Casa', 'Normal Edificio', 'Otros'];

    public function up(): void
    {
        $tipo = DB::table('tipos_parametro')->where('nombre', 'Tipo de Cliente')->first();
        if (!$tipo) {
            return;
        }

        DB::table('valores_parametro')
            ->where('tipo_parametro_id', $tipo->id)
            ->whereIn('nombre', self::VIEJOS)
            ->delete();

        $now = now();
        foreach (self::NUEVOS as $nombre) {
            $existe = DB::table('valores_parametro')
                ->where('tipo_parametro_id', $tipo->id)
                ->where('nombre', $nombre)
                ->exists();
            if (!$existe) {
                DB::table('valores_parametro')->insert([
                    'tipo_parametro_id' => $tipo->id, 'nombre' => $nombre,
                    'created_at' => $now, 'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        $tipo = DB::table('tipos_parametro')->where('nombre', 'Tipo de Cliente')->first();
        if (!$tipo) {
            return;
        }

        DB::table('valores_parametro')
            ->where('tipo_parametro_id', $tipo->id)
            ->whereIn('nombre', self::NUEVOS)
            ->delete();

        $now = now();
        foreach (self::VIEJOS as $nombre) {
            DB::table('valores_parametro')->insert([
                'tipo_parametro_id' => $tipo->id, 'nombre' => $nombre,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }
    }
};
