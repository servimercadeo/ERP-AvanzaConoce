<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cargo extends Model
{
    protected $table = 'cargos';
    public $incrementing = false;
    protected $fillable = ['id', 'nombre'];
}
