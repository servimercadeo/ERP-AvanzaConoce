<?php

namespace App\Services;

class EmpresaProyectoRules
{
    /**
     * Empresa (nombre exacto de la tabla `empresas`) => proyectos (nombre exacto de
     * `proyectos`) permitidos para esa empresa. Empresas que no aparecen aquí (Servimercadeo EC,
     * Servicios y Mercadeo EC, E2BPO, Confianza y Colaboración, FT&H Consulting, Altycom) no están
     * sujetas a esta regla.
     */
    private const REGLAS = [
        'SERVICIOS Y MERCADEO COL' => ['TIGO EXPRESS', 'TIGO HOME', 'ADMINISTRACION'],
        'SERVIMERCADEO COL'        => ['DIRECTV CO'],
    ];

    /**
     * Devuelve un mensaje de error si la combinación empresa+proyecto viola la regla, o null si
     * es válida (incluye el caso en que falta alguno de los dos valores, o la empresa no está
     * sujeta a esta regla).
     */
    public static function validar(?string $empresa, ?string $proyecto): ?string
    {
        if (!$empresa || !$proyecto) {
            return null;
        }

        $empresaKey = mb_strtoupper(trim($empresa), 'UTF-8');
        if (!isset(self::REGLAS[$empresaKey])) {
            return null;
        }

        $proyectoKey = mb_strtoupper(trim($proyecto), 'UTF-8');
        if (in_array($proyectoKey, self::REGLAS[$empresaKey], true)) {
            return null;
        }

        $permitidos = implode(', ', self::REGLAS[$empresaKey]);
        return "El proyecto \"{$proyecto}\" no es válido para la empresa \"{$empresa}\". Proyectos permitidos: {$permitidos}.";
    }
}
