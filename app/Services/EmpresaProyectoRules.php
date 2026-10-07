<?php

namespace App\Services;

class EmpresaProyectoRules
{
    /**
     * Empresa (nombre exacto de la tabla `empresas`) => proyectos (nombre exacto de
     * `proyectos`) permitidos para esa empresa. Empresas que no aparecen aquí (Servimercadeo EC,
     * Servicios y Mercadeo EC, E2BPO, Confianza y Colaboración, FT&H Consulting, Altycom) no están
     * sujetas a esta regla. ADMINISTRATIVO es solo de Servicios y Mercadeo (SYM), no de
     * Servimercadeo.
     */
    private const REGLAS = [
        'SERVICIOS Y MERCADEO COL' => ['TIGO EXPRESS', 'TIGO HOME', 'ADMINISTRATIVO'],
        'SERVIMERCADEO COL'        => ['DIRECTV CO'],
    ];

    /**
     * Nombres anteriores de un proyecto => nombre actual. "ADMINISTRACION" se renombró a
     * "ADMINISTRATIVO" (2026-09-24); contratos y requisiciones viejos pueden traer aún el
     * nombre anterior y no deben quedar bloqueados al editarlos.
     */
    private const ALIAS_PROYECTO = [
        'ADMINISTRACION' => 'ADMINISTRATIVO',
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

        $permitidos = self::proyectosPermitidos($empresa);
        if ($permitidos === null) {
            return null;
        }

        $proyectoKey = mb_strtoupper(trim($proyecto), 'UTF-8');
        $proyectoKey = self::ALIAS_PROYECTO[$proyectoKey] ?? $proyectoKey;
        if (in_array($proyectoKey, $permitidos, true)) {
            return null;
        }

        $lista = implode(', ', $permitidos);
        return "El proyecto \"{$proyecto}\" no está permitido para la empresa \"{$empresa}\". "
            . "Para esta empresa elige uno de estos proyectos: {$lista}.";
    }

    /**
     * Proyectos (nombre exacto de `proyectos`) permitidos para la empresa dada, o null si la
     * empresa no está sujeta a esta regla (o no se indicó empresa) y por tanto no hay
     * restricción: debe interpretarse como "todos los proyectos".
     */
    public static function proyectosPermitidos(?string $empresa): ?array
    {
        if (!$empresa) {
            return null;
        }

        $empresaKey = mb_strtoupper(trim($empresa), 'UTF-8');
        return self::REGLAS[$empresaKey] ?? null;
    }
}
