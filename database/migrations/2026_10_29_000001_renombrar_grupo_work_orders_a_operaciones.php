<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * El submódulo de Parametros que agrupa Tipo de Servicio, Tipo de Cliente, Proveedor /
     * Código Instalador, Perímetro de la Zona y Tecnología se llamaba "Work Orders" (mismo
     * nombre que el módulo real de Work Orders, lo que confundía); pasa a llamarse
     * "Operaciones". Solo cambia la etiqueta (columna `grupo`), no toca los tipos ni valores.
     */
    public function up(): void
    {
        DB::table('tipos_parametro')->where('grupo', 'Work Orders')->update(['grupo' => 'Operaciones', 'updated_at' => now()]);
    }

    public function down(): void
    {
        DB::table('tipos_parametro')->where('grupo', 'Operaciones')->update(['grupo' => 'Work Orders', 'updated_at' => now()]);
    }
};
