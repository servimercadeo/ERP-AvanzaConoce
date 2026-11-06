<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Torre de sedes para la columna "Torre" del exporte de Work Orders; no cambia el rol ni el cargo del empleado.
class Torre extends Model
{
    protected $table = 'torres';

    protected $fillable = ['user_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->belongsToMany(Sede::class, 'torre_sede', 'torre_id', 'sede_id')->withTimestamps();
    }
}
