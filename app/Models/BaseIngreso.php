<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BaseIngreso extends Model
{
    protected $table = 'base_ingresos';

    protected $fillable = [
        'cargo', 'proyecto_id', 'salario_base', 'auxilio_transporte',
        'tipo_contrato', 'descripcion', 'activo',
    ];

    protected $casts = [
        'salario_base'       => 'decimal:2',
        'auxilio_transporte' => 'decimal:2',
        'activo'             => 'boolean',
    ];

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class);
    }
}
