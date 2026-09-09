<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConceptoPedido extends Model
{
    protected $table = 'conceptos_pedido';
    protected $fillable = ['nombre', 'descripcion'];
}
