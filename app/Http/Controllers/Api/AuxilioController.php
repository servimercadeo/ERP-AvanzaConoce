<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuxilioAnulado;
use App\Models\AuxilioTramo;
use App\Models\User;
use App\Services\AuxilioProductividad;
use Illuminate\Http\Request;

/**
 * Auxilio por Productividad. Son dos escalas, las dos solo para gente directa (un aliado
 * nunca cobra): la del TÉCNICO, por cada Work Order que finaliza, y la del AUXILIAR, por
 * cada Work Order en la que acompañó a un directo (ver WorkOrderController::update).
 */
class AuxilioController extends Controller
{
    private function tipo(Request $request): string
    {
        return $request->tipo === AuxilioTramo::AUXILIAR ? AuxilioTramo::AUXILIAR : AuxilioTramo::TECNICO;
    }

    public function tramos(Request $request)
    {
        return response()->json(AuxilioProductividad::tramos($this->tipo($request)));
    }

    public function storeTramo(Request $request)
    {
        $data = $request->validate($this->reglas());

        return response()->json(AuxilioTramo::create($data + ['tipo' => $this->tipo($request)]), 201);
    }

    public function updateTramo(Request $request, AuxilioTramo $tramo)
    {
        $tramo->update($request->validate($this->reglas()));

        return response()->json($tramo);
    }

    public function destroyTramo(AuxilioTramo $tramo)
    {
        $tramo->delete();

        return response()->json(null, 204);
    }

    private function reglas(): array
    {
        return [
            'desde'           => 'required|integer|min:0',
            'hasta'           => 'nullable|integer|gte:desde',
            'valor_por_orden' => 'required|integer|min:0',
        ];
    }

    /**
     * Por cada persona con al menos una Work Order en el mes: cuántas hizo, el tramo que
     * alcanzó con ese total y el auxilio (cantidad × valor del tramo). El tramo es plano: al
     * pasar de rango se recalculan todas sus órdenes del mes. La regla vive en
     * AuxilioProductividad, la misma que usa la columna "Auxilio" del exporte de Work Orders.
     */
    public function reporte(Request $request)
    {
        $mes = $request->mes ?: now()->format('Y-m');
        $tipo = $this->tipo($request);
        $tramos = AuxilioProductividad::tramos($tipo);

        $resultados = $tipo === AuxilioTramo::AUXILIAR
            ? $this->deAuxiliares($mes, $tramos)
            : $this->deTecnicos($mes, $tramos);

        // Auxilios anulados a mano: por defecto no salen; con ?anulados=1 salen solos, para
        // poder restaurarlos.
        $anuladas = AuxilioAnulado::where('tipo', $tipo)->where('mes', $mes)->pluck('clave')->all();
        $verAnulados = filter_var($request->anulados, FILTER_VALIDATE_BOOLEAN);
        $resultados = $resultados
            ->map(fn ($r) => $r + ['anulado' => in_array($r['clave'], $anuladas, true)])
            ->filter(fn ($r) => $r['anulado'] === $verAnulados);

        $usuario = $request->user();
        // El técnico solo ve lo suyo; el reporte completo es para los demás con permiso.
        if ($usuario->rol === 'tecnico') {
            $resultados = $resultados->filter(fn ($r) => $r['cedula'] === (string) $usuario->cedula);
        }

        if ($request->search) {
            $q = mb_strtolower($request->search, 'UTF-8');
            $resultados = $resultados->filter(fn ($r) => str_contains(mb_strtolower($r['nombre'], 'UTF-8'), $q) || str_contains($r['cedula'], $q));
        }

        return response()->json([
            'mes'        => $mes,
            'tipo'       => $tipo,
            'tramos'     => $tramos,
            'resultados' => $resultados->sortBy('nombre')->values(),
        ]);
    }

    private function deTecnicos(string $mes, $tramos)
    {
        $usuarios = AuxilioProductividad::usuariosPorCedula();

        return AuxilioProductividad::ordenesDelMes($mes, $usuarios)
            ->map(function ($ordenes, $cedula) use ($usuarios, $tramos) {
                $wo = $ordenes->first();

                return $this->fila(
                    (string) $cedula,
                    $usuarios->get($cedula)?->name ?: $wo->nombre_tecnico_cierre ?: $wo->tecnico_agendado ?: $wo->nombre_tecnico ?: (string) $cedula,
                    AuxilioProductividad::ordenesPagadas($ordenes),
                    $tramos,
                );
            });
    }

    private function deAuxiliares(string $mes, $tramos)
    {
        $acompanamientos = AuxilioProductividad::acompanamientosDelMes($mes);
        $ids = $acompanamientos->keys()
            ->filter(fn ($llave) => str_starts_with($llave, 'u-'))
            ->map(fn ($llave) => (int) substr($llave, 2));
        $personas = User::whereIn('id', $ids)->get(['id', 'name', 'cedula'])->keyBy('id');
        $porNombre = $this->empleadosPorNombre();

        return $acompanamientos->map(function ($ordenes, $llave) use ($personas, $porNombre, $tramos) {
            $nombre = str_starts_with($llave, 'u-')
                ? ($personas->get((int) substr($llave, 2))?->name ?: $ordenes->first()->auxiliar)
                : $ordenes->first()->auxiliar;
            // Si el auxiliar se eligió del parámetro no hay id, pero casi siempre es un
            // empleado: se busca su cédula por el nombre antes de dejarla vacía.
            $cedula = str_starts_with($llave, 'u-')
                ? $personas->get((int) substr($llave, 2))?->cedula
                : $porNombre->get($this->clave($nombre))?->cedula;

            return $this->fila(
                (string) ($cedula ?? ''),
                $nombre,
                AuxilioProductividad::ordenesPagadas($ordenes),
                $tramos,
            );
        });
    }

    /** Empleados activos con cédula, indexados por su nombre normalizado. */
    private function empleadosPorNombre()
    {
        return User::where('activo', true)
            ->whereNotNull('cedula')
            ->where('cedula', '!=', '')
            ->get(['id', 'name', 'cedula'])
            ->keyBy(fn (User $u) => $this->clave($u->name));
    }

    /** Nombre sin tildes, sin espacios de sobra y en minúscula, para poder comparar. */
    private function clave(?string $nombre): string
    {
        $limpio = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', (string) $nombre) ?: (string) $nombre;

        return mb_strtolower(trim(preg_replace('/\s+/', ' ', $limpio)), 'UTF-8');
    }

    /** "Eliminar" el auxilio de una persona en un mes: no se tocan sus Work Orders. */
    public function anular(Request $request)
    {
        $datos = $request->validate([
            'clave'  => 'required|string|max:190',
            'nombre' => 'nullable|string|max:190',
            'mes'    => 'required|date_format:Y-m',
        ]);

        AuxilioAnulado::firstOrCreate(
            ['tipo' => $this->tipo($request), 'mes' => $datos['mes'], 'clave' => $datos['clave']],
            ['nombre' => $datos['nombre'] ?? null, 'anulado_por' => $request->user()->id],
        );

        return response()->json(null, 204);
    }

    /** Devuelve al reporte un auxilio que se había anulado. */
    public function restaurar(Request $request)
    {
        $datos = $request->validate([
            'clave' => 'required|string|max:190',
            'mes'   => 'required|date_format:Y-m',
        ]);

        AuxilioAnulado::where('tipo', $this->tipo($request))
            ->where('mes', $datos['mes'])
            ->where('clave', $datos['clave'])
            ->get()
            ->each->delete();

        return response()->json(null, 204);
    }

    private function fila(string $cedula, string $nombre, int $total, $tramos): array
    {
        $tramo = AuxilioProductividad::tramoDe($total, $tramos);

        return [
            // Con qué se identifica la fila al anularla: la cédula, o el nombre si el
            // auxiliar no es empleado del ERP y no tiene.
            'clave'         => $cedula !== '' ? $cedula : 'n-' . $this->clave($nombre),
            'cedula'        => $cedula,
            'nombre'        => $nombre,
            'total_wo'      => $total,
            'tramo'         => $tramo,
            'total_auxilio' => $tramo ? $total * $tramo->valor_por_orden : 0,
        ];
    }
}
