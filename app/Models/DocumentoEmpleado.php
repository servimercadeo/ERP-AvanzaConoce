<?php

namespace App\Models;

use App\Traits\RegistraAuditoria;
use Illuminate\Database\Eloquent\Model;

class DocumentoEmpleado extends Model
{
    use RegistraAuditoria;

    protected $table = 'documentos_empleado';

    protected $fillable = [
        'user_id',
        'nombre_documento',
        'nombre_seguimiento',
        'fecha_seguimiento',
        'responsable',
        'ruta',
        'nombre_original',
    ];

    protected $casts = [
        'fecha_seguimiento' => 'date:Y-m-d',
    ];

    public function empleado()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function auditoriaProceso(): string
    {
        return 'Empleados';
    }

    public function auditoriaNombreRegistro(): string
    {
        $nombre = trim(($this->empleado?->nombres ?? '') . ' ' . ($this->empleado?->apellidos ?? ''));
        $nombre = $nombre !== '' ? $nombre : ($this->empleado?->name ?? ('#' . $this->user_id));
        return "{$this->nombre_documento} ({$this->nombre_seguimiento}) — {$nombre}";
    }
}
