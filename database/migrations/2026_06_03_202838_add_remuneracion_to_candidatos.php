<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidatos', function (Blueprint $table) {
            $table->string('tasa_riesgo_arl')->nullable()->after('seguridad_estudio');
            $table->decimal('salario_basico', 12, 2)->nullable()->after('tasa_riesgo_arl');
            $table->decimal('auxilio_transporte', 12, 2)->nullable()->after('salario_basico');
            $table->decimal('otrosi_variable', 12, 2)->nullable()->after('auxilio_transporte');
            $table->decimal('auxilio_rodamiento', 12, 2)->nullable()->after('otrosi_variable');
            $table->decimal('auxilio_comunicacion', 12, 2)->nullable()->after('auxilio_rodamiento');
            $table->decimal('auxilio_alimentacion', 12, 2)->nullable()->after('auxilio_comunicacion');
        });
    }

    public function down(): void
    {
        Schema::table('candidatos', function (Blueprint $table) {
            $table->dropColumn([
                'tasa_riesgo_arl', 'salario_basico', 'auxilio_transporte',
                'otrosi_variable', 'auxilio_rodamiento', 'auxilio_comunicacion', 'auxilio_alimentacion',
            ]);
        });
    }
};
