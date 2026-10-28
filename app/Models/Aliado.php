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

    /** CC: cédula de ciudadanía · CE: cédula de extranjería · NIT. */
    public const TIPOS_DOCUMENTO = ['CC', 'CE', 'NIT'];

    protected $table = 'aliados';

    protected $fillable = [
        'tipo', 'tipo_documento', 'documento', 'nombre', 'contacto_nombre',
        'telefono', 'correo', 'ciudad', 'direccion', 'observaciones', 'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    /**
     * Proyectos de Parámetros que se le pueden asignar a un aliado: los activos, menos
     * ADMINISTRATIVO (un aliado no trabaja para el área administrativa).
     */
    public static function proyectosDisponibles()
    {
        return Proyecto::where('activo', true)
            ->whereRaw('UPPER(nombre) NOT IN (?, ?)', ['ADMINISTRATIVO', 'ADMINISTRACION'])
            ->orderBy('nombre')
            ->get(['id', 'nombre']);
    }

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

    /** Proyectos (de Parámetros) para los que trabaja: uno o varios. */
    public function proyectos()
    {
        return $this->belongsToMany(Proyecto::class, 'aliado_proyecto')->withTimestamps();
    }
}
