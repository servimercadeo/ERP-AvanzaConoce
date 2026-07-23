<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('centros_costo_catalogo', function (Blueprint $table) {
            $table->string('proyecto', 100)->nullable()->after('ciudad');
        });
    }

    public function down(): void
    {
        Schema::table('centros_costo_catalogo', function (Blueprint $table) {
            $table->dropColumn('proyecto');
        });
    }
};
