<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedidos_globales', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 10)->unique();
            $table->date('fecha');
            $table->unsignedInteger('total_pedidos')->default(0);
            $table->text('notas')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedidos_globales');
    }
};
