<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventario_dotacion', function (Blueprint $table) {
            $table->string('proyecto', 60)->default('TIGO EXPRESS')->after('id');
            $table->dropUnique('inventario_dotacion_unico');
            $table->unique(
                ['proyecto', 'categoria', 'subcategoria', 'genero', 'talla'],
                'inventario_dotacion_unico'
            );
        });
    }

    public function down(): void
    {
        Schema::table('inventario_dotacion', function (Blueprint $table) {
            $table->dropUnique('inventario_dotacion_unico');
            $table->dropColumn('proyecto');
            $table->unique(
                ['categoria', 'subcategoria', 'genero', 'talla'],
                'inventario_dotacion_unico'
            );
        });
    }
};
