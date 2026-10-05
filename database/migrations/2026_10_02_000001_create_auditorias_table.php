<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Auditoría del Sistema (Permisos > Auditoría, solo admin): rastro de quién creó,
     * editó o eliminó qué, en qué proceso del ERP. `usuario`/`rol` quedan copiados tal
     * cual estaban en el momento (no como relación en vivo), para que el historial no
     * cambie si luego se edita o borra ese usuario. Es un log de solo lectura: nunca se
     * edita ni se borra una fila ya escrita, por eso no tiene updated_at.
     */
    public function up(): void
    {
        Schema::create('auditorias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('usuario', 150)->nullable();
            $table->string('rol', 30)->nullable();
            $table->enum('accion', ['creado', 'actualizado', 'eliminado']);
            $table->string('proceso', 100);
            $table->string('modelo', 150);
            $table->unsignedBigInteger('registro_id')->nullable();
            $table->string('descripcion', 500);
            $table->timestamp('created_at')->nullable();

            $table->index('proceso');
            $table->index('accion');
            $table->index('user_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auditorias');
    }
};
