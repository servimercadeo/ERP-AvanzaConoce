<?php

namespace App\Models;

use App\Traits\RegistraAuditoria;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
        'tipo', 'tipo_documento', 'documento', 'nombre', 'representante_legal_nombre', 'representante_legal_documento',
        'codigo_pdv', 'modalidad_id_bt',
        'telefono', 'correo', 'ciudad', 'direccion', 'observaciones', 'jefe_inmediato_id', 'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'avanza_sync_at' => 'datetime',
    ];

    /** Hash de su contraseña de AvanzaConoce: solo para reenviarlo si el alta allá falló. */
    protected $hidden = ['avanza_password'];

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

    /** Usuarios que pueden ser jefe inmediato de un aliado: activos, menos técnicos y rol general. */
    public static function jefesDisponibles()
    {
        return User::where('activo', true)
            ->whereNotNull('rol')
            ->whereNotIn('rol', ['tecnico', 'general'])
            ->orderBy('name')
            ->get(['id', 'name', 'cargo']);
    }

    /**
     * Modalidades de AvanzaConoce (tabla `modalidades_bt`, sin el prefijo `erp_`: el ERP
     * comparte la base con AvanzaConoce). Se guarda el id de Bitrix (`id_bt`). Si la tabla no
     * se puede leer, la lista sale vacía.
     */
    public static function modalidadesDisponibles()
    {
        try {
            return collect(DB::select('select id_bt, nombre from `modalidades_bt` order by id'))
                ->map(fn ($m) => ['id_bt' => (int) $m->id_bt, 'nombre' => $m->nombre]);
        } catch (\Throwable $e) {
            Log::warning('No se pudo leer modalidades_bt de AvanzaConoce: ' . $e->getMessage());
            return collect();
        }
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

    public function jefeInmediato()
    {
        return $this->belongsTo(User::class, 'jefe_inmediato_id');
    }

    /** Proyectos (de Parámetros) para los que trabaja: uno o varios. */
    public function proyectos()
    {
        return $this->belongsToMany(Proyecto::class, 'aliado_proyecto')->withTimestamps();
    }
}
