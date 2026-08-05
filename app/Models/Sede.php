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
        'regional_id',
        'proyecto_id',
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
        'supervisor',
        'contacto_supervisor',
        'lider_regional',
        'contacto_lider_regional',
    ];

    public function padre()
    {
        return $this->belongsTo(Sede::class, 'id_sede_padre');
    }

    public function ciudad()
    {
        return $this->belongsTo(Ciudad::class, 'id_ciudad');
    }

    public function regional()
    {
        return $this->belongsTo(Regional::class, 'regional_id');
    }

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class, 'proyecto_id');
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

    public function proyectos()
    {
        return $this->belongsToMany(Proyecto::class, 'proyecto_sede');
    }
}
