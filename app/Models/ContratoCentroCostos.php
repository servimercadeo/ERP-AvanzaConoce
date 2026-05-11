<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContratoCentroCostos extends Model
{
    use HasFactory;

    protected $table = 'contrato_centros_costos';

    protected $fillable = [
        'contrato_id',
        'centro_costos',
        'porcentaje',
    ];

    protected $casts = [
        'porcentaje' => 'decimal:2',
    ];

    public function contrato()
    {
        return $this->belongsTo(Contrato::class);
    }
}
