<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Regional extends Model
{
    protected $table = 'regionales';
    protected $fillable = ['nombre', 'descripcion'];
}
