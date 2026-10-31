<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * El grupo de Parámetros "Operaciones" (Tipo de Servicio, Tipo de Cliente, Proveedor /
     * Código Instalador, Perímetro de la Zona, Tecnología) pasa a llamarse "Operativos" —
     * para no confundirse con el módulo real de Operaciones (Work Orders, Aliados,
     * Auxilios). Solo cambia la etiqueta (columna `grupo`), no toca los tipos ni valores.
     */
    public function up(): void
    {
        DB::table('tipos_parametro')->where('grupo', 'Operaciones')->update(['grupo' => 'Operativos', 'updated_at' => now()]);
    }

    public function down(): void
    {
        DB::table('tipos_parametro')->where('grupo', 'Operativos')->update(['grupo' => 'Operaciones', 'updated_at' => now()]);
    }
};
