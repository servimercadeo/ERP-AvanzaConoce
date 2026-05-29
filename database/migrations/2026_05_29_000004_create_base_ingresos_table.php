<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('base_ingresos', function (Blueprint $table) {
            $table->id();
            $table->string('cargo', 150);
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->decimal('salario_base', 12, 2);
            $table->decimal('auxilio_transporte', 12, 2)->default(0);
            $table->string('tipo_contrato', 60)->nullable();
            $table->text('descripcion')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('base_ingresos');
    }
};
