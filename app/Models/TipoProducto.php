<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoProducto extends Model
{
    protected $table = 'tipos_producto';
    protected $fillable = ['nombre', 'descripcion'];
}
