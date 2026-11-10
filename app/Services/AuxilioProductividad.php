<?php

namespace App\Services;

use App\Models\AuxilioTramo;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Regla del Auxilio por Productividad, compartida por el reporte de Auxilios y la columna
 * "Auxilio" del exporte de Work Orders: cada Work Order finalizada por un técnico DIRECTO se
 * paga al valor del tramo que alcanzó con el total del mes. El tramo es plano, no progresivo:
 * al pasar de rango se recalculan TODAS sus órdenes de ese mes, no solo las que lo superan.
 */
class AuxilioProductividad
{
    /** Columnas que necesitan cedulaDe(), esDirecto() y el conteo por orden. */
    public const FINALIZADO = 'Finalizado';

    public const COLUMNAS = [
        'numero_wo', 'modalidad', 'cedula_tecnico_cierre', 'cedula_tecnico_agendado', 'cedula_tecnico',
        'nombre_tecnico_cierre', 'tecnico_agendado', 'nombre_tecnico',
    ];

    /** Cédula del técnico al que se le paga esa WO: quien la cerró, si no el agendado, si no el asignado. */
    public static function cedulaDe(WorkOrder $wo): ?string
    {
        return $wo->cedula_tecnico_cierre ?: $wo->cedula_tecnico_agendado ?: $wo->cedula_tecnico;
    }

    /** aliado_id y nombre por cédula, para saber quién es directo. */
    public static function usuariosPorCedula(): Collection
    {
        return User::where('cedula', '!=', '')->get(['cedula', 'name', 'aliado_id'])->keyBy('cedula');
    }

    /** Un usuario sin aliado_id; si la cédula no tiene usuario, manda la MODALIDAD del archivo. */
    public static function esDirecto(WorkOrder $wo, Collection $usuarios): bool
    {
        $cedula = self::cedulaDe($wo);
        if (!$cedula) {
            return false;
        }
        $usuario = $usuarios->get($cedula);

        return $usuario
            ? !$usuario->aliado_id
            : mb_strtoupper(trim((string) $wo->modalidad), 'UTF-8') === 'DIRECTO';
    }

    public static function tramos(string $tipo = AuxilioTramo::TECNICO): Collection
    {
        return AuxilioTramo::deTipo($tipo)->orderBy('desde')->get();
    }

    public static function tramoDe(int $total, Collection $tramos): ?AuxilioTramo
    {
        return $tramos->first(fn (AuxilioTramo $t) => $total >= $t->desde && ($t->hasta === null || $total <= $t->hasta));
    }

    /** Las WO de directos finalizadas en ese mes (Y-m), agrupadas por la cédula que las cobra. */
    public static function ordenesDelMes(string $mes, Collection $usuarios, ?array $cedulas = null): Collection
    {
        $inicio = Carbon::createFromFormat('Y-m', $mes)->startOfMonth();

        return WorkOrder::query()
            ->where('estado', self::FINALIZADO)
            ->whereBetween('fecha_finalizacion', [$inicio, $inicio->copy()->endOfMonth()])
            ->get(self::COLUMNAS)
            ->filter(fn (WorkOrder $wo) => self::esDirecto($wo, $usuarios)
                && ($cedulas === null || in_array(self::cedulaDe($wo), $cedulas, true)))
            ->groupBy(fn (WorkOrder $wo) => self::cedulaDe($wo));
    }

    /** Un mismo WO trae una fila por ítem: se paga por orden, no por fila. */
    public static function ordenesPagadas(Collection $ordenes): int
    {
        return $ordenes->unique('numero_wo')->count();
    }

    /**
     * Lo que acompañó cada auxiliar en el mes: user_id (o el nombre, si no es del ERP) => las
     * WO donde quedó como ACOMPAÑANTE de un directo. Su escala es otra, la de tipo auxiliar.
     */
    public static function acompanamientosDelMes(string $mes): Collection
    {
        $inicio = Carbon::createFromFormat('Y-m', $mes)->startOfMonth();

        return WorkOrder::query()
            ->where('estado', self::FINALIZADO)
            ->whereBetween('fecha_finalizacion', [$inicio, $inicio->copy()->endOfMonth()])
            ->whereNotNull('auxiliar')
            ->where('auxiliar', '!=', '')
            ->get(['numero_wo', 'auxiliar', 'auxiliar_user_id'])
            ->groupBy(fn (WorkOrder $wo) => $wo->auxiliar_user_id ? "u-{$wo->auxiliar_user_id}" : "n-{$wo->auxiliar}");
    }

    /** Valor que se le paga a cada orden de ese técnico en el mes, por cédula. */
    public static function valorPorOrdenDelMes(string $mes, Collection $usuarios, array $cedulas): Collection
    {
        $tramos = self::tramos();

        return self::ordenesDelMes($mes, $usuarios, $cedulas)
            ->map(fn (Collection $ordenes) => self::tramoDe(self::ordenesPagadas($ordenes), $tramos)?->valor_por_orden);
    }
}
