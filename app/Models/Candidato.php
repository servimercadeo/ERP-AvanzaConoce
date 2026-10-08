<?php

namespace App\Models;

use App\Traits\RegistraAuditoria;
use Illuminate\Database\Eloquent\Model;

class Candidato extends Model
{
    use RegistraAuditoria;

    protected $table = 'candidatos';

    public function auditoriaProceso(): string
    {
        return 'Selección';
    }

    public function auditoriaNombreRegistro(): string
    {
        return $this->nombres ?: ('#' . $this->id);
    }

    protected $fillable = [
        'requisicion_id', 'nombres', 'tipo_documento', 'identificacion',
        'fecha_expedicion', 'lugar_expedicion', 'edad', 'ciudad_id', 'correo', 'celular',
        'fecha_postulacion', 'fuente', 'fuente_especifica', 'estado',
        'pruebas', 'aval', 'tipo_vinculacion', 'empleador_id', 'correos_aval', 'fecha_aval', 'negocio', 'observaciones',
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
        // Remuneración
        'fotografia',
        'tasa_riesgo_arl', 'arl', 'caja_compensacion',
        'salario_basico', 'auxilio_transporte',
        'otrosi_variable', 'auxilio_rodamiento', 'auxilio_comunicacion', 'auxilio_alimentacion',
        // Datos de contratación
        'lugar_trabajo', 'fecha_programacion_ingreso', 'fecha_correccion',
        // Datos personales
        'genero',
    ];

    protected $casts = [
        'fecha_expedicion'    => 'date:Y-m-d',
        'fecha_postulacion'   => 'date:Y-m-d',
        'fecha_aval'          => 'date:Y-m-d',
        'fraude_fecha_consulta'        => 'date:Y-m-d',
        'fecha_programacion_ingreso'   => 'date:Y-m-d',
        'fecha_correccion'             => 'date:Y-m-d',
        'pruebas'             => 'boolean',
        'aval'                => 'boolean',
        'correos_aval'        => 'array',
        'asmt_prom'           => 'float',
        'entv_prom'           => 'float',
    ];

    protected static function booted(): void
    {
        // El lugar de trabajo y la fecha de ingreso son los de la requisición mientras no se
        // elija otro valor.
        static::saving(function (Candidato $candidato) {
            if (!$candidato->requisicion_id || ($candidato->lugar_trabajo && $candidato->fecha_programacion_ingreso)) {
                return;
            }
            $req = Requisicion::find($candidato->requisicion_id);
            $candidato->lugar_trabajo              = $candidato->lugar_trabajo ?: $req?->sede?->nombre;
            $candidato->fecha_programacion_ingreso = $candidato->fecha_programacion_ingreso ?: $req?->fecha_ingreso;
        });
    }

    /** Correo en minúsculas y sin espacios (ver IdentidadUnica). */
    public function setCorreoAttribute($value): void
    {
        $this->attributes['correo'] = $value === null ? null : \App\Services\IdentidadUnica::normalizarCorreo($value);
    }

    public function requisicion()
    {
        return $this->belongsTo(Requisicion::class);
    }

    public function ciudad()
    {
        return $this->belongsTo(Ciudad::class);
    }

    /** Empleador elegido al dar el aval (directo o indirecto según la vinculación). */
    public function empleador()
    {
        return $this->belongsTo(Empleador::class);
    }

    /**
     * Nombre del empleador del candidato: el del aval; las requisiciones antiguas, que
     * todavía traían empleador, sirven de respaldo.
     */
    public function empleadorNombre(): ?string
    {
        return $this->empleador?->nombre ?: $this->requisicion?->empleador?->nombre;
    }

    public function documentos()
    {
        return $this->hasMany(CandidatoDocumento::class);
    }
}
