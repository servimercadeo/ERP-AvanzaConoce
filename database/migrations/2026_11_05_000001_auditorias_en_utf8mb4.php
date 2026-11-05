<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * En producción la tabla se creó a mano con otro juego de caracteres, que no admite "→" ni
 * otros símbolos de la descripción. Como la auditoría se escribe dentro de la misma operación,
 * el error tumbaba la asignación de inventario con un 500. Solo convierte si hace falta.
 */
return new class extends Migration
{
    public function up(): void
    {
        $tabla = DB::getTablePrefix() . 'auditorias';

        $columna = DB::selectOne(
            'select character_set_name as charset from information_schema.columns
             where table_schema = database() and table_name = ? and column_name = ?',
            [$tabla, 'descripcion'],
        );

        if ($columna && $columna->charset !== 'utf8mb4') {
            DB::statement("ALTER TABLE `{$tabla}` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        }
    }

    public function down(): void
    {
        // No se revierte: volver atrás perdería los símbolos ya guardados.
    }
};
