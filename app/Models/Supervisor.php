<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Supervisor de técnicos para la columna "Supervisor" del exporte de Work Orders; no cambia el rol ni el cargo del empleado.
class Supervisor extends Model
{
    protected $table = 'supervisores';

    protected $fillable = ['user_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->belongsToMany(User::class, 'supervisor_tecnico', 'supervisor_id', 'tecnico_id')->withTimestamps();
    }
}
