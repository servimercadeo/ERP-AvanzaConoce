<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidatos', function (Blueprint $table) {
            $table->string('genero', 30)->nullable()->after('edad');
        });

        // Poner "Masculino" a Juan Camilo (buscar por nombre ya que está en candidatos)
        DB::table('candidatos')
            ->where('nombres', 'like', '%JUAN CAMILO%')
            ->update(['genero' => 'Masculino']);
    }

    public function down(): void
    {
        Schema::table('candidatos', function (Blueprint $table) {
            $table->dropColumn('genero');
        });
    }
};
