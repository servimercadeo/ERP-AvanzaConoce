<?php

namespace App\Models;

use App\Traits\RegistraAuditoria;
use Illuminate\Database\Eloquent\Model;

/**
 * Aliado (subagente) de Work Orders: una empresa con técnicos a cargo, o un técnico
 * indirecto que es su propio aliado. Ver la migración create_aliados_table.
 */
class Aliado extends Model
{
    use RegistraAuditoria;

    public const EMPRESA = 'empresa';
    public const TECNICO = 'tecnico';

    protected $table = 'aliados';

    protected $fillable = [
        'tipo', 'tipo_documento', 'documento', 'nombre', 'contacto_nombre',
        'telefono', 'correo', 'ciudad', 'direccion', 'observaciones', 'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function auditoriaProceso(): string
    {
        return 'Aliados';
    }

    public function auditoriaNombreRegistro(): string
    {
        return "{$this->nombre} ({$this->tipo_documento} {$this->documento})";
    }

    public function tecnicos()
    {
        return $this->hasMany(User::class, 'aliado_id');
    }
}
