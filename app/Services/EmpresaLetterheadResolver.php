<?php

namespace App\Services;

/**
 * "SERVIMERCADEO" o "SYM" para el encabezado de cualquier acta (Dotación, Pedidos,
 * Traslado, Asignación de Inventario) según el nombre de la empresa asociada
 * (contrato, empleado o usuario): si ese nombre contiene "SERVICIOS" (de "Servicios y
 * Mercadeo") es SYM, si no, SERVIMERCADEO. Sin dato, se asume SERVIMERCADEO
 * (comportamiento histórico, de cuando el texto estaba fijo). Mismo criterio para
 * todas las actas, centralizado aquí para no repetirlo en cada servicio.
 */
class EmpresaLetterheadResolver
{
    public static function resolver(?string $nombreEmpresa): string
    {
        if (!$nombreEmpresa) {
            return 'SERVIMERCADEO';
        }

        return str_contains(mb_strtoupper($nombreEmpresa, 'UTF-8'), 'SERVICIOS') ? 'SYM' : 'SERVIMERCADEO';
    }
}
