<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sede extends Model
{
    use HasFactory;

    protected $table = 'sedes';

    protected $fillable = [
        'nombre',
        'id_ciudad',
        'direccion',
        'telefono',
        'estado',
        'id_consultor_mac',
        'id_almacenista_mac',
        'id_secretaria_mac',
        'id_jefe_mac',
        'id_user_mac',
        'id_torre_mac',
        'codigo_distribuidor',
        'codigo_instalador',
        'numero_contrato_inicial',
        'numero_contrato_final',
        'meta_prepago',
        'meta_postpago',
        'tipo_sede',
        'id_sede_padre',
        'sub_canal',
    ];

    public function padre()
    {
        return $this->belongsTo(Sede::class, 'id_sede_padre');
    }

    public function almacenista()
    {
        return $this->belongsTo(User::class, 'id_almacenista_mac');
    }

    public function secretaria()
    {
        return $this->belongsTo(User::class, 'id_secretaria_mac');
    }

    public function jefe()
    {
        return $this->belongsTo(User::class, 'id_jefe_mac');
    }
}
