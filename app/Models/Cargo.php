<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Catálogo de cargos (Parámetros > Cargos). El id no es autoincremental: ver CargoController. */
class Cargo extends Model
{
    protected $table = 'cargos';
    public $incrementing = false;
    protected $fillable = ['id', 'nombre', 'en_requisicion'];

    protected $casts = [
        'en_requisicion' => 'boolean',
    ];
}
