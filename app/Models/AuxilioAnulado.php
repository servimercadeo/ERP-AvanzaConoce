<?php

namespace App\Models;

use App\Traits\RegistraAuditoria;
use Illuminate\Database\Eloquent\Model;

class AuxilioAnulado extends Model
{
    use RegistraAuditoria;

    protected $table = 'auxilios_anulados';

    protected $fillable = ['tipo', 'mes', 'clave', 'nombre', 'anulado_por'];

    public function auditoriaProceso(): string
    {
        return 'Auxilios';
    }
}
