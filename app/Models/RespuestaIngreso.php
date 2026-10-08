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
        'fondo_cesantias',
        'talla_camisa',
        'talla_pantalon',
        'talla_zapatos',
        'fotografia',
    ];

    /** Correo en minúsculas y sin espacios (ver IdentidadUnica). */
    public function setCorreoAttribute($value): void
    {
        $this->attributes['correo'] = $value === null ? null : \App\Services\IdentidadUnica::normalizarCorreo($value);
    }
}
