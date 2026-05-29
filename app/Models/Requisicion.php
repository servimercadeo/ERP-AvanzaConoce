<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Requisicion extends Model
{
    protected $table = 'requisiciones';

    protected $fillable = [
        'nro_identificacion_proceso', 'nro_identificacion', 'estado',
        'cargo', 'cargo_solicitante', 'fecha_solicitud', 'fecha_ingreso',
        'fecha_cierre', 'requeridas', 'contratadas', 'proyecto_id',
        'tipo_solicitud', 'responsable', 'proceso', 'ciudad', 'pais',
        'solicitud_confidencial', 'observaciones',
    ];

    protected $casts = [
        'fecha_solicitud'        => 'date:Y-m-d',
        'fecha_ingreso'          => 'date:Y-m-d',
        'fecha_cierre'           => 'date:Y-m-d',
        'solicitud_confidencial' => 'boolean',
    ];

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class);
    }

    public function candidatos()
    {
        return $this->hasMany(Candidato::class);
    }
}
