<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidatos', function (Blueprint $table) {
            // Drop the JSON column added in the previous migration
            $table->dropColumn('procesos');

            // Assessment
            $table->string('asmt_ejercicio', 120)->nullable()->after('observaciones');
            $table->string('asmt_nombre_ejercicio', 120)->nullable()->after('asmt_ejercicio');
            $table->unsignedTinyInteger('asmt_claridad_mensaje')->nullable()->after('asmt_nombre_ejercicio');
            $table->unsignedTinyInteger('asmt_conviccion_energia')->nullable()->after('asmt_claridad_mensaje');
            $table->unsignedTinyInteger('asmt_adaptabilidad_escucha')->nullable()->after('asmt_conviccion_energia');
            $table->unsignedTinyInteger('asmt_orientacion_accion')->nullable()->after('asmt_adaptabilidad_escucha');
            $table->unsignedTinyInteger('asmt_manejo_presion')->nullable()->after('asmt_orientacion_accion');
            $table->decimal('asmt_prom', 4, 2)->nullable()->after('asmt_manejo_presion');

            // Entrevista
            $table->unsignedTinyInteger('entv_trayectoria')->nullable()->after('asmt_prom');
            $table->unsignedTinyInteger('entv_conexion_cliente')->nullable()->after('entv_trayectoria');
            $table->unsignedTinyInteger('entv_aprendizaje_madurez')->nullable()->after('entv_conexion_cliente');
            $table->unsignedTinyInteger('entv_motivacion')->nullable()->after('entv_aprendizaje_madurez');
            $table->unsignedTinyInteger('entv_disposicion_proyecto')->nullable()->after('entv_motivacion');
            $table->decimal('entv_prom', 4, 2)->nullable()->after('entv_disposicion_proyecto');

            // Retroalimentación
            $table->text('retroalimentacion')->nullable()->after('entv_prom');

            // Referencias laborales
            $table->text('ref_laboral_1')->nullable()->after('retroalimentacion');
            $table->text('ref_laboral_2')->nullable()->after('ref_laboral_1');

            // Fraudes
            $table->string('fraude_nro_seguimiento', 60)->nullable()->after('ref_laboral_2');
            $table->string('fraude_respuesta', 120)->nullable()->after('fraude_nro_seguimiento');
            $table->string('fraude_ciudad', 100)->nullable()->after('fraude_respuesta');
            $table->date('fraude_fecha_consulta')->nullable()->after('fraude_ciudad');
            $table->string('fraude_fuente', 120)->nullable()->after('fraude_fecha_consulta');

            // Seguridad
            $table->text('seguridad_estudio')->nullable()->after('fraude_fuente');
        });
    }

    public function down(): void
    {
        Schema::table('candidatos', function (Blueprint $table) {
            $table->dropColumn([
                'asmt_ejercicio', 'asmt_nombre_ejercicio', 'asmt_claridad_mensaje',
                'asmt_conviccion_energia', 'asmt_adaptabilidad_escucha', 'asmt_orientacion_accion',
                'asmt_manejo_presion', 'asmt_prom',
                'entv_trayectoria', 'entv_conexion_cliente', 'entv_aprendizaje_madurez',
                'entv_motivacion', 'entv_disposicion_proyecto', 'entv_prom',
                'retroalimentacion',
                'ref_laboral_1', 'ref_laboral_2',
                'fraude_nro_seguimiento', 'fraude_respuesta', 'fraude_ciudad',
                'fraude_fecha_consulta', 'fraude_fuente',
                'seguridad_estudio',
            ]);
            $table->json('procesos')->nullable()->after('observaciones');
        });
    }
};
