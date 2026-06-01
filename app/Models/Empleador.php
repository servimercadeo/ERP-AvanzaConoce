<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Empleador extends Model
{
    protected $table = 'empleadores';
    public $incrementing = false;
    protected $fillable = ['id', 'nombre'];
}
