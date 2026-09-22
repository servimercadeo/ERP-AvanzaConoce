<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Algunos productos (ej. botas, guantes) necesitan tallas: la misma sede puede tener
     * varias filas del mismo producto, una por talla. `talla` es NOT NULL con default ''
     * (en vez de NULL) a propósito: en MySQL dos filas NULL en un índice único no chocan
     * entre sí, así que con NULL cualquier producto SIN talla terminaría creando una fila
     * nueva cada vez que se le agrega stock, en vez de sumarse a la que ya existía.
     *
     * Cada paso se protege con un "if" (idempotente): un primer intento de esta
     * migración alcanzó a agregar la columna `talla` antes de fallar por el índice
     * único (MySQL no deja borrarlo sin antes darle su propio índice a la FK de
     * tipo_producto_id, que dependía de él), así que un reintento no puede asumir que
     * arranca desde cero.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('inventario_productos', 'talla')) {
            Schema::table('inventario_productos', function (Blueprint $table) {
                $table->string('talla', 50)->default('')->after('tipo_producto_id');
            });
        }

        $prefix = DB::getTablePrefix();
        $indices = collect(DB::select("SHOW INDEX FROM `{$prefix}inventario_productos`"))->pluck('Key_name')->unique();

        if (!$indices->contains('inventario_productos_tipo_producto_id_index')) {
            Schema::table('inventario_productos', function (Blueprint $table) {
                $table->index('tipo_producto_id', 'inventario_productos_tipo_producto_id_index');
            });
        }

        if ($indices->contains('inventario_productos_unico')) {
            // El único índice compuesto por (tipo_producto_id, sede_id) ya no hace falta
            // como respaldo de FK una vez que tipo_producto_id tiene el suyo propio arriba.
            Schema::table('inventario_productos', function (Blueprint $table) {
                $table->dropUnique('inventario_productos_unico');
            });
        }

        $indices = collect(DB::select("SHOW INDEX FROM `{$prefix}inventario_productos`"))->pluck('Key_name')->unique();
        if (!$indices->contains('inventario_productos_unico')) {
            Schema::table('inventario_productos', function (Blueprint $table) {
                $table->unique(['tipo_producto_id', 'sede_id', 'talla'], 'inventario_productos_unico');
            });
        }
    }

    public function down(): void
    {
        Schema::table('inventario_productos', function (Blueprint $table) {
            $table->dropUnique('inventario_productos_unico');
            $table->unique(['tipo_producto_id', 'sede_id'], 'inventario_productos_unico');
            $table->dropIndex('inventario_productos_tipo_producto_id_index');
            $table->dropColumn('talla');
        });
    }
};
