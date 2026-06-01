<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ciudad extends Model
{
    protected $table = 'ciudades';
    public $incrementing = false;
    protected $fillable = ['id', 'nombre'];
}
