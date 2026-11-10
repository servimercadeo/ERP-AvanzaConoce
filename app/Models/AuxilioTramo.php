<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuxilioTramo extends Model
{
    /** 'tecnico' (quien finaliza la WO) o 'auxiliar' (quien lo acompañó). */
    public const TECNICO = 'tecnico';

    public const AUXILIAR = 'auxiliar';

    protected $fillable = ['tipo', 'desde', 'hasta', 'valor_por_orden'];

    public function scopeDeTipo($query, string $tipo)
    {
        return $query->where('tipo', $tipo);
    }
}
