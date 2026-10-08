<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BaseIngreso extends Model
{
    use SoftDeletes;
    protected $table = 'base_ingresos';

    protected $fillable = [
        'candidato_id', 'fecha_aval', 'documento_identificacion', 'nombre_completo',
        'cargo', 'ciudad', 'empresa', 'proyecto', 'telefono', 'correo',
        'tipo_vinculacion', 'lugar_trabajo', 'lider_inmediato', 'empleador',
        'fecha_programacion_ingreso', 'fecha_correccion', 'tasa_riesgo_arl',
        'salario_basico', 'auxilio_transporte', 'otrosi_variable',
        'auxilio_rodamiento', 'auxilio_comunicacion', 'auxilio_alimentacion',
        'estado', 'alerta_enviada',
    ];

    protected $casts = [
        'fecha_aval'                 => 'date:Y-m-d',
        'fecha_programacion_ingreso' => 'date:Y-m-d',
        'fecha_correccion'           => 'date:Y-m-d',
        'salario_basico'             => 'decimal:2',
        'auxilio_transporte'         => 'decimal:2',
        'otrosi_variable'            => 'decimal:2',
        'auxilio_rodamiento'         => 'decimal:2',
        'auxilio_comunicacion'       => 'decimal:2',
        'auxilio_alimentacion'       => 'decimal:2',
        'alerta_enviada'             => 'boolean',
    ];

    public function candidato()
    {
        return $this->belongsTo(Candidato::class);
    }

    /**
     * Tipo de vinculación (Directa/Indirecta) de una cédula: primero el del aval vigente en
     * la base de ingresos (editable en Avales de contratación) y si no, el del candidato.
     */
    public static function tipoVinculacionDe(?string $cedula): ?string
    {
        return $cedula ? (static::tiposVinculacionDe([$cedula])[$cedula] ?? null) : null;
    }

    /**
     * Igual que tipoVinculacionDe() pero para muchas cédulas en dos consultas.
     *
     * @return array<string, string|null>  cédula => tipo de vinculación
     */
    public static function tiposVinculacionDe(array $cedulas): array
    {
        $cedulas = array_values(array_unique(array_filter(array_map('strval', $cedulas))));
        if (!$cedulas) {
            return [];
        }

        // Por cédula queda el registro más reciente (el último en el orden ascendente).
        $deAval = static::whereIn('documento_identificacion', $cedulas)
            ->orderBy('created_at')->orderBy('id')
            ->get(['documento_identificacion', 'tipo_vinculacion'])
            ->keyBy('documento_identificacion');
        $deCandidato = Candidato::whereIn('identificacion', $cedulas)
            ->orderBy('created_at')->orderBy('id')
            ->get(['identificacion', 'tipo_vinculacion'])
            ->keyBy('identificacion');

        $tipos = [];
        foreach ($cedulas as $cedula) {
            $tipos[$cedula] = $deAval->get($cedula)?->tipo_vinculacion
                ?: $deCandidato->get($cedula)?->tipo_vinculacion;
        }

        return $tipos;
    }

    /**
     * Los indirectos no cargan documentos de contratación: con el formulario de registro
     * ya pueden pasar a contratos y no se les envía el correo de carga de documentos.
     */
    public static function esIndirecta(?string $cedula): bool
    {
        return static::tipoVinculacionDe($cedula) === 'Indirecta';
    }
}
