<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ValorParametro extends Model
{
    protected $table = 'valores_parametro';

    protected $fillable = ['tipo_parametro_id', 'nombre', 'descripcion'];

    public function tipoParametro()
    {
        return $this->belongsTo(TipoParametro::class);
    }
}
