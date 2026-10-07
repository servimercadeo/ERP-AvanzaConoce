<?php

namespace App\Models;

use App\Traits\RegistraAuditoria;
use Illuminate\Database\Eloquent\Model;

class Requisicion extends Model
{
    use RegistraAuditoria;

    protected $table = 'requisiciones';

    public function auditoriaProceso(): string
    {
        return 'Selección';
    }

    public function auditoriaNombreRegistro(): string
    {
        return $this->nro_identificacion ? "Requisición {$this->nro_identificacion}" : ('#' . $this->id);
    }

    protected static function boot()
    {
        parent::boot();
        static::saving(function ($model) {
            if (empty($model->registro_token)) {
                $model->registro_token = \Illuminate\Support\Str::uuid()->toString();
            }
        });
    }

    protected $fillable = [
        'nro_identificacion_proceso', 'registro_token', 'nro_identificacion', 'estado',
        'cargo_id', 'cargo_solicitante', 'fecha_solicitud', 'fecha_ingreso',
        'fecha_cierre', 'requeridas', 'contratadas', 'proyecto_id', 'empresa_id',
        'empleador_id', 'tipo_solicitud', 'responsable', 'proceso', 'ciudad_id', 'sede_id', 'regional_id', 'pais',
        'solicitud_confidencial', 'observaciones',
    ];

    protected $casts = [
        'fecha_solicitud'        => 'date:Y-m-d',
        'fecha_ingreso'          => 'date:Y-m-d',
        'fecha_cierre'           => 'date:Y-m-d',
        'solicitud_confidencial' => 'boolean',
    ];

    public function proyecto()
    {
        return $this->belongsTo(Proyecto::class);
    }

    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }

    public function cargo()
    {
        return $this->belongsTo(Cargo::class);
    }

    public function empleador()
    {
        return $this->belongsTo(Empleador::class);
    }

    public function ciudad()
    {
        return $this->belongsTo(Ciudad::class);
    }

    public function sede()
    {
        return $this->belongsTo(Sede::class);
    }

    public function regional()
    {
        return $this->belongsTo(Regional::class);
    }

    public function candidatos()
    {
        return $this->hasMany(Candidato::class);
    }

    /** Vacantes cubiertas: candidatos de la requisición con aval de contratación activo. */
    public function vacantesCubiertas(): int
    {
        return $this->candidatos()->where('aval', true)->count();
    }

    /**
     * Vacantes requeridas como entero. Si quedó vacío (null/0) se toma 1, igual que la columna
     * por defecto y la tabla de Selección; comparar `0 >= null` en PHP da true y bloqueaba el aval.
     */
    public function vacantesRequeridas(): int
    {
        return max(1, (int) $this->requeridas);
    }

    public function tieneVacantesLibres(): bool
    {
        return $this->vacantesCubiertas() < $this->vacantesRequeridas();
    }

    /**
     * Cierra la requisición automáticamente cuando se cubren todas sus vacantes, y la reabre
     * ("En proceso") si una cerrada vuelve a tener vacantes libres (se quitó un aval o se
     * aumentaron las vacantes). Las canceladas no se tocan.
     */
    public function actualizarEstadoPorVacantes(): void
    {
        if ($this->estado === 'Cancelada') {
            return;
        }

        $completa = !$this->tieneVacantesLibres();

        if ($completa && $this->estado !== 'Completada') {
            $this->update(['estado' => 'Completada']);
        } elseif (!$completa && $this->estado === 'Completada') {
            $this->update(['estado' => 'En proceso']);
        }
    }

    public static function actualizarEstadoPorVacantesDe(?int $id): void
    {
        if ($id) {
            static::find($id)?->actualizarEstadoPorVacantes();
        }
    }
}
