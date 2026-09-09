<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClasePedido extends Model
{
    protected $table = 'clases_pedido';
    protected $fillable = ['nombre', 'descripcion'];
}
