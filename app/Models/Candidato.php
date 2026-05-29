<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Candidato extends Model
{
    protected $table = 'candidatos';

    protected $fillable = [
        'requisicion_id', 'nombres', 'tipo_documento', 'identificacion',
        'fecha_expedicion', 'edad', 'ciudad', 'correo', 'celular',
        'fecha_postulacion', 'fuente', 'fuente_especifica', 'estado',
        'pruebas', 'aval', 'negocio', 'observaciones',
        // Assessment
        'asmt_ejercicio', 'asmt_nombre_ejercicio',
        'asmt_claridad_mensaje', 'asmt_conviccion_energia', 'asmt_adaptabilidad_escucha',
        'asmt_orientacion_accion', 'asmt_manejo_presion', 'asmt_prom',
        // Entrevista
        'entv_trayectoria', 'entv_conexion_cliente', 'entv_aprendizaje_madurez',
        'entv_motivacion', 'entv_disposicion_proyecto', 'entv_prom',
        // Otras secciones
        'retroalimentacion',
        'ref_laboral_1', 'ref_laboral_2',
        'fraude_nro_seguimiento', 'fraude_respuesta', 'fraude_ciudad',
        'fraude_fecha_consulta', 'fraude_fuente',
        'seguridad_estudio',
    ];

    protected $casts = [
        'fecha_expedicion'    => 'date:Y-m-d',
        'fecha_postulacion'   => 'date:Y-m-d',
        'fraude_fecha_consulta' => 'date:Y-m-d',
        'pruebas'             => 'boolean',
        'aval'                => 'boolean',
        'asmt_prom'           => 'float',
        'entv_prom'           => 'float',
    ];

    public function requisicion()
    {
        return $this->belongsTo(Requisicion::class);
    }
}
