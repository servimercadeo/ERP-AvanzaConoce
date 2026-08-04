<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Proyecto extends Model
{
    protected $table = 'proyectos';

    protected $fillable = ['nombre', 'activo', 'empresa_id'];

    protected $casts = ['activo' => 'boolean'];

    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }

    public function requisiciones()
    {
        return $this->hasMany(Requisicion::class);
    }

    public function baseIngresos()
    {
        return $this->hasMany(BaseIngreso::class);
    }

    public function sedes()
    {
        return $this->belongsToMany(Sede::class, 'proyecto_sede');
    }
}
