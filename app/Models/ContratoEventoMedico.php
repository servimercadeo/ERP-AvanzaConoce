<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContratoEventoMedico extends Model
{
    protected $table = 'contrato_eventos_medicos';

    protected $fillable = [
        'contrato_id',
        'fecha_ingreso_seguimiento',
        'tipo_evento',
        'origen_diagnostico',
        'diagnostico',
        'recomendaciones',
        'vigencia_desde',
        'vigencia_hasta',
        'condicion',
        'estado',
    ];

    protected $casts = [
        'fecha_ingreso_seguimiento' => 'date',
        'vigencia_desde'            => 'date',
        'vigencia_hasta'            => 'date',
    ];

    public function contrato()
    {
        return $this->belongsTo(Contrato::class);
    }
}
