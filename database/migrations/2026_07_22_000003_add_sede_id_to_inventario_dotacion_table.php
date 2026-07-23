<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventario_dotacion', function (Blueprint $table) {
            $table->dropUnique('inventario_dotacion_unico');
            $table->foreignId('sede_id')->nullable()->after('proyecto')->constrained('sedes')->nullOnDelete();
            $table->unique(['proyecto', 'prenda', 'genero', 'talla', 'sede_id'], 'inventario_dotacion_unico');
        });
    }

    public function down(): void
    {
        Schema::table('inventario_dotacion', function (Blueprint $table) {
            $table->dropUnique('inventario_dotacion_unico');
            $table->dropConstrainedForeignId('sede_id');
            $table->unique(['proyecto', 'prenda', 'genero', 'talla'], 'inventario_dotacion_unico');
        });
    }
};
