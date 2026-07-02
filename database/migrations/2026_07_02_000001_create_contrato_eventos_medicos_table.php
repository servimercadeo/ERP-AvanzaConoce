<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contrato_eventos_medicos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contrato_id')->constrained('contratos')->cascadeOnDelete();
            $table->date('fecha_ingreso_seguimiento')->nullable();
            $table->string('tipo_evento', 120)->nullable();
            $table->string('origen_diagnostico', 150)->nullable();
            $table->text('diagnostico')->nullable();
            $table->text('recomendaciones')->nullable();
            $table->date('vigencia_desde')->nullable();
            $table->date('vigencia_hasta')->nullable();
            $table->string('condicion', 100)->nullable();
            $table->string('estado', 80)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contrato_eventos_medicos');
    }
};
