<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PermisoDenegado extends Model
{
    protected $table = 'permisos_denegados';

    protected $fillable = ['rol', 'modulo_id', 'submodulo_id'];

    public const ROLES_GESTIONABLES = ['gestor', 'consultor', 'th', 'tic'];
}
