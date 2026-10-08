<?php

namespace App\Services;

class EmpresaProyectoRules
{
    /**
     * Empresa (nombre de la tabla `empresas`) => proyectos (nombre de `proyectos`) que puede
     * usar. Servimercadeo solo maneja DIRECTV y ADMINISTRATIVO; SYM maneja todo lo demás
     * (TIGO, HUGHES, FT&H, S&M ASESORES y los proyectos que se creen después), y ADMINISTRATIVO
     * lo comparten las dos. Empresas que no aparecen aquí (Servimercadeo EC, Servicios y
     * Mercadeo EC, E2BPO, Confianza y Colaboración, FT&H Consulting, Altycom) no están sujetas
     * a esta regla.
     *   'solo'    => únicamente estos proyectos.
     *   'excepto' => cualquier proyecto menos los que empiezan por estos nombres.
     */
    private const REGLAS = [
        'SERVIMERCADEO COL'        => ['solo'    => ['DIRECTV CO', 'ADMINISTRATIVO']],
        'SERVICIOS Y MERCADEO COL' => ['excepto' => ['DIRECTV']],
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
     * Empleadores directos (nombre de la tabla `empleadores`) => prefijo del nombre de la
     * empresa que les corresponde (Servimercadeo COL/EC, Servicios y Mercadeo COL/EC). Los
     * empleadores temporales (SENA, STAFFING, JOB AND TALENT, SERTEMPCO, S&M ASESORES...) no
     * aparecen aquí: con ellos la empresa puede ser cualquiera.
     */
    private const EMPRESA_POR_EMPLEADOR = [
        'SERVIMERCADEO'            => ['prefijo' => 'SERVIMERCADEO',        'nombre' => 'Servimercadeo'],
        'S&M SERVICIOS Y MERCADEO' => ['prefijo' => 'SERVICIOS Y MERCADEO', 'nombre' => 'Servicios y Mercadeo'],
    ];

    /**
     * Devuelve un mensaje de error si el empleador es directo y la empresa no es la suya, o
     * null si es válida (incluye el caso en que falta alguno de los dos valores, o el
     * empleador es temporal y por tanto no está sujeto a esta regla).
     */
    public static function validarEmpleador(?string $empleador, ?string $empresa): ?string
    {
        if (!$empleador || !$empresa) {
            return null;
        }

        $regla = self::EMPRESA_POR_EMPLEADOR[mb_strtoupper(trim($empleador), 'UTF-8')] ?? null;
        if ($regla === null) {
            return null;
        }

        if (str_starts_with(mb_strtoupper(trim($empresa), 'UTF-8'), $regla['prefijo'])) {
            return null;
        }

        return "La empresa \"{$empresa}\" no corresponde al empleador \"{$empleador}\": "
            . "con este empleador la empresa debe ser {$regla['nombre']}.";
    }

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

        if (self::permite($empresa, $proyecto)) {
            return null;
        }

        $regla = self::REGLAS[mb_strtoupper(trim($empresa), 'UTF-8')];
        $detalle = isset($regla['solo'])
            ? 'Para esta empresa elige uno de estos proyectos: ' . implode(', ', $regla['solo']) . '.'
            : 'Los proyectos ' . implode(', ', $regla['excepto']) . ' no son de esta empresa: elige otro proyecto.';

        return "El proyecto \"{$proyecto}\" no está permitido para la empresa \"{$empresa}\". {$detalle}";
    }

    /** true si la empresa está sujeta a la regla empresa -> proyectos. */
    public static function restringida(?string $empresa): bool
    {
        return $empresa !== null && isset(self::REGLAS[mb_strtoupper(trim($empresa), 'UTF-8')]);
    }

    /**
     * true si la empresa puede usar el proyecto (también cuando falta alguno de los dos o la
     * empresa no está sujeta a la regla).
     */
    public static function permite(?string $empresa, ?string $proyecto): bool
    {
        if (!$empresa || !$proyecto) {
            return true;
        }

        $regla = self::REGLAS[mb_strtoupper(trim($empresa), 'UTF-8')] ?? null;
        if ($regla === null) {
            return true;
        }

        $proyectoKey = mb_strtoupper(trim($proyecto), 'UTF-8');
        $proyectoKey = self::ALIAS_PROYECTO[$proyectoKey] ?? $proyectoKey;

        if (isset($regla['solo'])) {
            return in_array($proyectoKey, $regla['solo'], true);
        }

        foreach ($regla['excepto'] as $prefijo) {
            if (str_starts_with($proyectoKey, $prefijo)) {
                return false;
            }
        }

        return true;
    }
}
