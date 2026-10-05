<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Auditoria extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'usuario',
        'rol',
        'accion',
        'proceso',
        'modelo',
        'registro_id',
        'descripcion',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime:Y-m-d H:i:s',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
