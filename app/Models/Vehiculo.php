<?php

namespace App\Models;

use App\Traits\RegistraAuditoria;
use Illuminate\Database\Eloquent\Model;

class Vehiculo extends Model
{
    use RegistraAuditoria;

    protected $fillable = [
        'tipo',
        'placa',
        'cc_propietario',
        'tarjeta_propiedad_frontal',
        'tarjeta_propiedad_trasera',
        'fecha_matricula',
        'fecha_vence_soat',
        'fecha_vence_tecnomecanica',
        'tecnico_asignado_id',
    ];

    protected $casts = [
        'fecha_matricula'           => 'date:Y-m-d',
        'fecha_vence_soat'          => 'date:Y-m-d',
        'fecha_vence_tecnomecanica' => 'date:Y-m-d',
    ];

    protected $appends = ['fecha_vence_matricula'];

    public function auditoriaProceso(): string
    {
        return 'Parametros';
    }

    public function auditoriaNombreRegistro(): string
    {
        return "{$this->tipo} {$this->placa}";
    }

    public function tecnicoAsignado()
    {
        return $this->belongsTo(User::class, 'tecnico_asignado_id');
    }

    /** La tarjeta de propiedad vence 2 años después de la fecha de matrícula (ley colombiana). */
    public function getFechaVenceMatriculaAttribute(): ?string
    {
        return $this->fecha_matricula ? $this->fecha_matricula->copy()->addYears(2)->format('Y-m-d') : null;
    }
}
