<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventario_dotacion', function (Blueprint $table) {
            $table->unsignedInteger('precio')->default(0)->after('talla');
        });
    }

    public function down(): void
    {
        Schema::table('inventario_dotacion', function (Blueprint $table) {
            $table->dropColumn('precio');
        });
    }
};
