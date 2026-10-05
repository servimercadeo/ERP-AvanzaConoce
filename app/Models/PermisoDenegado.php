<?php

namespace App\Models;

use App\Traits\RegistraAuditoria;
use Illuminate\Database\Eloquent\Model;

class PermisoDenegado extends Model
{
    use RegistraAuditoria;

    protected $table = 'permisos_denegados';

    protected $fillable = ['rol', 'modulo_id', 'submodulo_id'];

    public function auditoriaProceso(): string
    {
        return 'Permisos';
    }

    public function auditoriaNombreRegistro(): string
    {
        return "{$this->rol} · {$this->modulo_id}/{$this->submodulo_id}";
    }

    public const ROLES_GESTIONABLES = ['th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general'];
}
