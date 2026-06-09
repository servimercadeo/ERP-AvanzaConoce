<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BaseIngreso extends Model
{
    use SoftDeletes;
    protected $table = 'base_ingresos';

    protected $fillable = [
        'candidato_id', 'fecha_aval', 'documento_identificacion', 'nombre_completo',
        'cargo', 'ciudad', 'empresa', 'proyecto', 'telefono', 'correo',
        'tipo_vinculacion', 'lugar_trabajo', 'lider_inmediato', 'empleador',
        'fecha_programacion_ingreso', 'fecha_correccion', 'tasa_riesgo_arl',
        'salario_basico', 'auxilio_transporte', 'otrosi_variable',
        'auxilio_rodamiento', 'auxilio_comunicacion', 'auxilio_alimentacion',
        'estado', 'alerta_enviada',
    ];

    protected $casts = [
        'fecha_aval'                 => 'date:Y-m-d',
        'fecha_programacion_ingreso' => 'date:Y-m-d',
        'fecha_correccion'           => 'date:Y-m-d',
        'salario_basico'             => 'decimal:2',
        'auxilio_transporte'         => 'decimal:2',
        'otrosi_variable'            => 'decimal:2',
        'auxilio_rodamiento'         => 'decimal:2',
        'auxilio_comunicacion'       => 'decimal:2',
        'auxilio_alimentacion'       => 'decimal:2',
        'alerta_enviada'             => 'boolean',
    ];

    public function candidato()
    {
        return $this->belongsTo(Candidato::class);
    }
}
