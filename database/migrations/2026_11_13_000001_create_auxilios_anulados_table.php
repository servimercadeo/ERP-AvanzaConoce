<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Auxilios anulados a mano. El reporte de auxilios se calcula con las Work Orders del mes,
 * no se guarda; para poder "eliminar" la fila de una persona se deja aquí la anulación
 * (tipo de escala + mes + persona) y el reporte la saca. Se puede restaurar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auxilios_anulados', function (Blueprint $table) {
            $table->id();
            $table->string('tipo', 20);  // tecnico | auxiliar
            $table->string('mes', 7);    // YYYY-MM
            // Cédula de la persona, o "n-<nombre>" si el auxiliar no es empleado del ERP.
            $table->string('clave', 190);
            $table->string('nombre', 190)->nullable();
            $table->foreignId('anulado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['tipo', 'mes', 'clave']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auxilios_anulados');
    }
};
