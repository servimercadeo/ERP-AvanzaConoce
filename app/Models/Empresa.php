<?php

namespace App\Models;

use App\Traits\RegistraAuditoria;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Empresa extends Model
{
    use RegistraAuditoria;

    protected $fillable = ['nombre', 'nit', 'pais', 'activo'];

    public function auditoriaProceso(): string
    {
        return 'Parámetros';
    }

    public function empleados(): HasMany
    {
        return $this->hasMany(User::class, 'empresa_id');
    }
}
