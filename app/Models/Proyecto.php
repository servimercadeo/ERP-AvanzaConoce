<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Proyecto extends Model
{
    protected $table = 'proyectos';

    protected $fillable = ['nombre', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function requisiciones()
    {
        return $this->hasMany(Requisicion::class);
    }

    public function baseIngresos()
    {
        return $this->hasMany(BaseIngreso::class);
    }
}
