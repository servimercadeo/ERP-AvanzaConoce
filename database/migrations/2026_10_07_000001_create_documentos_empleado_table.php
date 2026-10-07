<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documentos_empleado', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('nombre_documento', 150);
            $table->string('nombre_seguimiento', 150);
            $table->date('fecha_seguimiento');
            $table->string('responsable', 100);
            $table->string('ruta')->nullable();
            $table->string('nombre_original')->nullable();
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documentos_empleado');
    }
};
