<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fondos_pensiones', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('nombre', 100);
            $table->timestamps();
        });

        Schema::create('fondos_cesantias', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('nombre', 100);
            $table->timestamps();
        });

        Schema::table('contratos', function (Blueprint $table) {
            $table->unsignedInteger('id_macaw')->nullable()->unique()->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('contratos', function (Blueprint $table) {
            $table->dropColumn('id_macaw');
        });
        Schema::dropIfExists('fondos_cesantias');
        Schema::dropIfExists('fondos_pensiones');
    }
};
