<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

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

    /** Correo en minúsculas y sin espacios (ver IdentidadUnica). */
    public function setCorreoAttribute($value): void
    {
        $this->attributes['correo'] = $value === null ? null : \App\Services\IdentidadUnica::normalizarCorreo($value);
    }

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
     * Ingresos (de la colección) a los que ya se les creó contrato: un contrato del
     * empleado con esa cédula creado desde el aval. Los contratos anteriores al aval
     * (un reingreso) no cuentan.
     *
     * @param  iterable<BaseIngreso>  $ingresos
     * @return array<int, bool>  id del ingreso => tiene contrato
     */
    public static function conContrato(iterable $ingresos): array
    {
        $ingresos = collect($ingresos);
        $cedulas = $ingresos->pluck('documento_identificacion')->filter()->map(fn ($c) => (string) $c)->unique()->values();

        $ultimoContrato = $cedulas->isEmpty() ? collect() : Contrato::query()
            ->join('users', 'contratos.empleado_id', '=', 'users.id')
            ->whereIn('users.cedula', $cedulas)
            ->groupBy('users.cedula')
            ->select('users.cedula')
            // wrap() agrega el prefijo de las tablas (en producción erp_contratos): escrito
            // a mano en el SQL crudo, "contratos.created_at" no existe allá.
            ->selectRaw('MAX(' . DB::getQueryGrammar()->wrap('contratos.created_at') . ') as ultimo')
            ->pluck('ultimo', 'cedula');

        return $ingresos->mapWithKeys(function (BaseIngreso $i) use ($ultimoContrato) {
            $ultimo = $ultimoContrato->get((string) $i->documento_identificacion);

            return [$i->id => $ultimo !== null && (!$i->created_at || $ultimo >= $i->created_at->toDateTimeString())];
        })->all();
    }

    public function tieneContrato(): bool
    {
        return static::conContrato([$this])[$this->id] ?? false;
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
