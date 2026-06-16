<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RespuestaIngreso extends Model
{
    protected $table = 'respuestas_ingresos';

    protected $fillable = [
        'documento',
        'nombres',
        'apellidos',
        'fecha_nacimiento',
        'lugar_nacimiento',
        'estado_civil',
        'numero_hijos',
        'rh',
        'nivel_escolaridad',
        'profesion',
        'ciudad',
        'barrio',
        'direccion',
        'estrato',
        'correo',
        'celular',
        'emergencia_nombre',
        'emergencia_telefono',
        'emergencia_parentesco',
        'eps',
        'afp',
        'talla_camisa',
        'talla_pantalon',
        'talla_zapatos',
    ];
}
