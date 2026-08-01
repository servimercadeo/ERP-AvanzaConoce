<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contrato extends Model
{
    use HasFactory;

    protected $table = 'contratos';

    protected $fillable = [
        'id_macaw',
        'empleado_id',
        'tipo_contrato',
        'tipo_vinculacion',
        'cargo',
        'sede',
        'area_empresa',
        'jefe_inmediato',
        'jefe_inmediato_nombre',
        'jefe_inmediato_correo',
        'fecha_ingreso',
        'fecha_retiro',
        'salario',
        'auxilio_transporte_legal',
        'arl',
        'fecha_vinculacion_arl',
        'lps_afiliado',
        'fecha_vinculacion_lps',
        'caja_compensacion',
        'fecha_vinculacion_caja',
        'fondo_pensiones',
        'fondo_cesantias',
        'estado_contrato',
        'completado',
        'empleador',
        'empresa',
        'cliente_proyecto',
        'regional_id',
        'origen_seguimiento',
        'seguimiento_fecha_cierre',
        'seguimiento_observaciones',
    ];

    protected $casts = [
        'fecha_ingreso' => 'date',
        'fecha_retiro' => 'date',
        'fecha_vinculacion_arl' => 'date',
        'fecha_vinculacion_lps' => 'date',
        'fecha_vinculacion_caja' => 'date',
        'salario' => 'decimal:2',
        'auxilio_transporte_legal' => 'decimal:2',
        'completado'                  => 'boolean',
        'seguimiento_fecha_cierre'    => 'date',
        'seguimiento_observaciones'   => 'array',
    ];

    public function empleado()
    {
        return $this->belongsTo(User::class, 'empleado_id');
    }

    public function regional()
    {
        return $this->belongsTo(Regional::class);
    }

    public function centrosCostos()
    {
        return $this->hasMany(ContratoCentroCostos::class, 'contrato_id');
    }

    public function anexos()
    {
        return $this->hasMany(ContratoAnexo::class, 'contrato_id');
    }

    public function eventosMedicos()
    {
        return $this->hasMany(ContratoEventoMedico::class, 'contrato_id');
    }
}
