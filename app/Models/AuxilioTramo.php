<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuxilioTramo extends Model
{
    protected $fillable = ['desde', 'hasta', 'valor_por_orden'];
}
