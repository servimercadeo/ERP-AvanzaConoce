<?php

namespace App\Services;

use App\Models\BaseIngreso;
use Illuminate\Support\Facades\DB;

/**
 * Empresa que se muestra al candidato en los formularios y correos del proceso de
 * selección (registro, nuevos ingresos, carga de documentos): la de su requisición.
 * Servimercadeo COL → Servimercadeo; cualquier otra (o sin requisición) → S&M.
 */
class EmpresaDelProceso
{
    public const SYM = [
        'clave'  => 'sym',
        'nombre' => 'S&M Servicios y Mercadeo S.A.S.',
        'corto'  => 'S&M',
        'sigla'  => 'S&M',
    ];

    public const SERVIMERCADEO = [
        'clave'  => 'servimercadeo',
        'nombre' => 'Servimercadeo S.A.S.',
        'corto'  => 'Servimercadeo',
        'sigla'  => 'SVM',
    ];

    /** @return array{clave: string, nombre: string, corto: string, sigla: string} */
    public static function deNombre(?string $empresa): array
    {
        $empresa = mb_strtoupper(trim((string) $empresa), 'UTF-8');

        return str_starts_with($empresa, 'SERVIMERCADEO') ? self::SERVIMERCADEO : self::SYM;
    }

    /** Por el token del link de registro de la requisición. */
    public static function deToken(?string $token): array
    {
        $empresa = $token
            ? DB::table('requisiciones')
                ->leftJoin('empresas', 'requisiciones.empresa_id', '=', 'empresas.id')
                ->where('requisiciones.registro_token', $token)
                ->value('empresas.nombre')
            : null;

        return self::deNombre($empresa);
    }

    /**
     * Por la cédula: la empresa del aval más reciente (editable en Avales de contratación)
     * y si no, la de la requisición del candidato más reciente.
     */
    public static function deCedula(?string $cedula): array
    {
        $cedula = trim((string) $cedula);
        if ($cedula === '') {
            return self::SYM;
        }

        $empresa = BaseIngreso::where('documento_identificacion', $cedula)
            ->whereNotNull('empresa')->where('empresa', '!=', '')
            ->latest()->latest('id')
            ->value('empresa');

        $empresa ??= DB::table('candidatos')
            ->join('requisiciones', 'candidatos.requisicion_id', '=', 'requisiciones.id')
            ->join('empresas', 'requisiciones.empresa_id', '=', 'empresas.id')
            ->where('candidatos.identificacion', $cedula)
            ->orderByDesc('candidatos.created_at')->orderByDesc('candidatos.id')
            ->value('empresas.nombre');

        return self::deNombre($empresa);
    }
}
