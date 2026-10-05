<?php

namespace App\Models;

use App\Traits\RegistraAuditoria;
use Illuminate\Database\Eloquent\Model;

class Proveedor extends Model
{
    use RegistraAuditoria;

    protected $table = 'proveedores';

    protected $fillable = ['nit', 'naturaleza', 'nombre'];

    public function auditoriaProceso(): string
    {
        return 'Parámetros';
    }
}
