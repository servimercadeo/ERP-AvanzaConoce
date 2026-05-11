<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Empresa extends Model
{
    protected $fillable = ['nombre', 'nit', 'pais', 'activo'];

    public function empleados(): HasMany
    {
        return $this->hasMany(User::class, 'empresa_id');
    }
}
