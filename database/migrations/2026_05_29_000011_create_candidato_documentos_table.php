<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidato_documentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidato_id')->constrained('candidatos')->cascadeOnDelete();
            $table->string('nombre', 120);
            $table->string('ruta', 500);
            $table->string('nombre_original', 300);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidato_documentos');
    }
};
