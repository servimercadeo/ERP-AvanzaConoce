<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Requisicion extends Model
{
    protected $table = 'requisiciones';

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->registro_token)) {
                $model->registro_token = \Illuminate\Support\Str::uuid()->toString();
            }
        });
    }

    protected $fillable = [
        'nro_identificacion_proceso', 'registro_token', 'nro_identificacion', 'estado',
        'cargo_id', 'cargo_solicitante', 'fecha_solicitud', 'fecha_ingreso',
        'fecha_cierre', 'requeridas', 'contratadas', 'proyecto_id', 'empresa_id',
        'empleador_id', 'tipo_solicitud', 'responsable', 'proceso', 'ciudad_id', 'pais',
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

    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }

    public function cargo()
    {
        return $this->belongsTo(Cargo::class);
    }

    public function empleador()
    {
        return $this->belongsTo(Empleador::class);
    }

    public function ciudad()
    {
        return $this->belongsTo(Ciudad::class);
    }

    public function candidatos()
    {
        return $this->hasMany(Candidato::class);
    }
}
