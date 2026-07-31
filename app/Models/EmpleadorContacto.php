<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmpleadorContacto extends Model
{
    protected $table = 'empleador_contactos';

    protected $fillable = ['empleador_id', 'nombre', 'correo', 'regional_id'];

    public function empleador()
    {
        return $this->belongsTo(Empleador::class);
    }

    public function regional()
    {
        return $this->belongsTo(Regional::class);
    }
}
