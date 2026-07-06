<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CronogramaDotacion extends Model
{
    protected $table = 'cronograma_dotacion';

    protected $fillable = ['proyecto_id', 'fecha_entrega', 'ciclo_meses', 'activo'];

    protected $casts = [
        'fecha_entrega' => 'date:Y-m-d',
        'activo'        => 'boolean',
    ];

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class);
    }
}
