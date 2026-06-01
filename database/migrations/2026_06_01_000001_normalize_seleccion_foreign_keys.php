<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // requisiciones: agregar FK columns
        Schema::table('requisiciones', function (Blueprint $table) {
            $table->foreignId('cargo_id')->nullable()->constrained('cargos')->nullOnDelete()->after('estado');
            $table->foreignId('empleador_id')->nullable()->constrained('empleadores')->nullOnDelete()->after('empresa_id');
            $table->foreignId('ciudad_id')->nullable()->constrained('ciudades')->nullOnDelete()->after('proceso');
        });

        // requisiciones: eliminar columnas de texto
        Schema::table('requisiciones', function (Blueprint $table) {
            $table->dropColumn(['cargo', 'empleador', 'ciudad']);
        });

        // candidatos: agregar FK column
        Schema::table('candidatos', function (Blueprint $table) {
            $table->foreignId('ciudad_id')->nullable()->constrained('ciudades')->nullOnDelete()->after('edad');
        });

        // candidatos: eliminar columna de texto
        Schema::table('candidatos', function (Blueprint $table) {
            $table->dropColumn('ciudad');
        });
    }

    public function down(): void
    {
        Schema::table('requisiciones', function (Blueprint $table) {
            $table->dropForeign(['cargo_id']);
            $table->dropForeign(['empleador_id']);
            $table->dropForeign(['ciudad_id']);
            $table->dropColumn(['cargo_id', 'empleador_id', 'ciudad_id']);
            $table->string('cargo', 150)->nullable();
            $table->string('empleador', 150)->nullable();
            $table->string('ciudad', 120)->nullable();
        });

        Schema::table('candidatos', function (Blueprint $table) {
            $table->dropForeign(['ciudad_id']);
            $table->dropColumn('ciudad_id');
            $table->string('ciudad', 120)->nullable();
        });
    }
};
