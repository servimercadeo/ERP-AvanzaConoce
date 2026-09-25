<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoParametro extends Model
{
    protected $table = 'tipos_parametro';

    protected $fillable = ['nombre'];

    public function valores()
    {
        return $this->hasMany(ValorParametro::class);
    }
}
