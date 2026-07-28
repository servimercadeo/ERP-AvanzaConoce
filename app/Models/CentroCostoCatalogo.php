<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CentroCostoCatalogo extends Model
{
    protected $table = 'centros_costo_catalogo';

    protected $fillable = [
        'codigo',
        'nombre',
        'ciudad',
        'proyecto',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];
}
