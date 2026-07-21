<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventario_dotacion', function (Blueprint $table) {
            $table->string('prenda', 150)->nullable()->after('proyecto');
        });

        // Unifica categoria + subcategoria en un solo nombre de prenda. Cuando la
        // subcategoria es igual a la categoria (p. ej. "Carnet"/"Carnet" o
        // "Gorra"/"Gorra") o está vacía, se usa solo la categoria para no
        // duplicar la palabra.
        DB::table('inventario_dotacion')->orderBy('id')->select('id', 'categoria', 'subcategoria')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    $categoria = trim((string) $row->categoria);
                    $subcategoria = trim((string) ($row->subcategoria ?? ''));
                    $prenda = ($subcategoria === '' || strcasecmp($subcategoria, $categoria) === 0)
                        ? $categoria
                        : $categoria . ' ' . $subcategoria;

                    DB::table('inventario_dotacion')->where('id', $row->id)->update(['prenda' => $prenda]);
                }
            });

        Schema::table('inventario_dotacion', function (Blueprint $table) {
            $table->dropUnique('inventario_dotacion_unico');
        });

        Schema::table('inventario_dotacion', function (Blueprint $table) {
            $table->string('prenda', 150)->nullable(false)->change();
            $table->dropColumn(['categoria', 'subcategoria']);
        });

        Schema::table('inventario_dotacion', function (Blueprint $table) {
            $table->unique(['proyecto', 'prenda', 'genero', 'talla'], 'inventario_dotacion_unico');
        });
    }

    public function down(): void
    {
        Schema::table('inventario_dotacion', function (Blueprint $table) {
            $table->dropUnique('inventario_dotacion_unico');
        });

        Schema::table('inventario_dotacion', function (Blueprint $table) {
            $table->string('categoria', 60)->nullable()->after('proyecto');
            $table->string('subcategoria', 80)->nullable()->after('categoria');
        });

        // No es posible reconstruir con precisión la categoria/subcategoria original
        // a partir de "prenda" (la separación se perdió); se deja el nombre completo
        // en categoria como mejor esfuerzo.
        DB::table('inventario_dotacion')->orderBy('id')->select('id', 'prenda')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('inventario_dotacion')->where('id', $row->id)->update([
                        'categoria' => $row->prenda,
                        'subcategoria' => '',
                    ]);
                }
            });

        Schema::table('inventario_dotacion', function (Blueprint $table) {
            $table->string('categoria', 60)->nullable(false)->change();
            $table->string('subcategoria', 80)->nullable(false)->change();
            $table->dropColumn('prenda');
        });

        Schema::table('inventario_dotacion', function (Blueprint $table) {
            $table->unique(['proyecto', 'categoria', 'subcategoria', 'genero', 'talla'], 'inventario_dotacion_unico');
        });
    }
};
