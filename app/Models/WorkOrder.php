<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkOrder extends Model
{
    protected $table = 'work_orders';

    protected $fillable = [
        'numero_wo',
        'numero_item',
        'estado',
        'fecha_estado',
        'servicio',
        'tipo_orden',
        'prioridad',
        'proveedor',
        'cuadrilla_tecnico',
        'nombre_tecnico',
        'cedula_tecnico',
        'modalidad',
        'perimetro',
        'departamento',
        'municipio',
        'barrio',
        'direccion',
        'fecha_creacion',
        'fecha_vencimiento',
        'fecha_finalizacion',
        'inicio_agendado',
        'fin_agendado',
        'descripcion',
        'aging',
        'region_servicio',
    ];

    protected $casts = [
        'fecha_estado'       => 'datetime:Y-m-d H:i',
        'fecha_creacion'     => 'datetime:Y-m-d H:i',
        'fecha_vencimiento'  => 'datetime:Y-m-d H:i',
        'fecha_finalizacion' => 'datetime:Y-m-d H:i',
        'aging'              => 'integer',
    ];
}
