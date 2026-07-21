<?php

namespace App\Services;

use App\Models\Contrato;
use App\Models\InventarioDotacion;
use App\Models\PedidoAutomatico;
use App\Models\RespuestaIngreso;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DotacionAutoPedidoService
{
    private const PROYECTO_A_INVENTARIO = [
        'TIGO EXPRESS' => 'SYM TIGO EXPRESS',
        'TIGO HOME'    => 'SYM TIGO HOME',
        'DIRECTV CO'   => 'DIRECTV',
        'DIRECTV ECU'  => 'DIRECTV',
    ];

    // Cargos DIRECTV cuya labor es instalación en campo (coincidencia exacta,
    // a diferencia de los demás grupos: "TECNICO" como substring atrapa
    // cargos de oficina/calidad que no deben recibir el kit de instalador.
    private const DIRECTV_TECNICOS_INSTALADORES = [
        'TECNICO DE INSTALACIONES (AUX)',
        'TECNICO AUXILIAR EN CAMPO',
        'AUXILIAR TECNICO EN ALTURAS',
        'TECNICO SENIOR',
        'AUXILIAR TECNICO',
    ];

    /**
     * Genera (si aplica) el pedido automático de dotación para un contrato recién creado,
     * según el proyecto/cargo del empleado. Se crea en estado "Activo" y descuenta el
     * inventario de inmediato (igual que un pedido manual activo); si luego se cancela o
     * se elimina, el inventario se restaura automáticamente (mismo flujo que cualquier
     * pedido Activo, ver PedidoAutomaticoController::update/destroy).
     * Devuelve null si el proyecto/cargo no está cubierto por ninguna regla.
     */
    public function generarPedidoParaContrato(Contrato $contrato): ?PedidoAutomatico
    {
        $empleado = User::find($contrato->empleado_id);
        if (!$empleado) {
            return null;
        }

        $this->completarTallasDesdeRespuestaIngreso($empleado);

        $proyecto = self::PROYECTO_A_INVENTARIO[$contrato->cliente_proyecto] ?? 'SYM ADMINISTRATIVO';
        $cargo    = mb_strtoupper(trim($contrato->cargo ?? ''), 'UTF-8');
        $genero   = in_array($empleado->genero, ['Masculino', 'Femenino'], true) ? $empleado->genero : 'Unisex';

        $reglas = $this->resolverReglas($proyecto, $cargo, $genero, $empleado);

        // Solo se genera pedido cuando el proyecto+cargo coincide con una de las reglas
        // definidas. Si el cargo no está cubierto, no se crea nada (aunque el proyecto sí
        // sea SYM/DIRECTV) — evita pedidos vacíos para cargos fuera de las reglas dadas.
        if (empty($reglas)) {
            return null;
        }

        return DB::transaction(function () use ($contrato, $reglas) {
            $pedido = PedidoAutomatico::create([
                'codigo'       => PedidoAutomatico::generarCodigo(),
                'contrato_id'  => $contrato->id,
                'empleado_id'  => $contrato->empleado_id,
                'estado'       => 'Activo',
                'fecha_pedido' => now()->toDateString(),
                'notas'        => 'Generado automáticamente al crear el contrato.',
            ]);

            foreach ($reglas as [$proyecto, $prenda, $genero, $talla, $cantidad]) {
                $inv = $this->buscarItemConStock($proyecto, $prenda, $genero, $talla, $cantidad);
                if (!$inv) {
                    continue;
                }

                $pedido->items()->create([
                    'inventario_dotacion_id' => $inv->id,
                    'cantidad'               => $cantidad,
                ]);
                $inv->decrement('cantidad', $cantidad);
            }

            return $pedido;
        });
    }

    /**
     * Completa (en memoria, sin persistir) las tallas del empleado que falten con las
     * registradas en "Respuestas de Ingresos" (documento = cédula), igual que hace
     * EmpleadoController::index() para la lista de empleados.
     */
    private function completarTallasDesdeRespuestaIngreso(User $empleado): void
    {
        if ($empleado->talla_camisa && $empleado->talla_pantalon && $empleado->talla_zapatos) {
            return;
        }

        $respuesta = RespuestaIngreso::where('documento', $empleado->cedula)->first();

        $empleado->talla_camisa   = $empleado->talla_camisa   ?: $respuesta?->talla_camisa;
        $empleado->talla_pantalon = $empleado->talla_pantalon ?: $respuesta?->talla_pantalon;
        $empleado->talla_zapatos  = $empleado->talla_zapatos  ?: $respuesta?->talla_zapatos;
    }

    /**
     * Busca el item de inventario para una línea de dotación, con lock para evitar
     * condiciones de carrera con otros pedidos concurrentes. Si no existe, si la talla
     * del empleado no está registrada, o si no hay stock suficiente, devuelve null y
     * deja constancia en el log (esa línea simplemente se omite del pedido).
     */
    private function buscarItemConStock(string $proyecto, string $prenda, string $genero, ?string $talla, int $cantidad): ?InventarioDotacion
    {
        $descripcion = "{$prenda} ({$proyecto}, {$genero})";

        if (!$talla) {
            Log::info("DotacionAutoPedidoService: talla no registrada para el empleado, no se asigna {$descripcion}.");
            return null;
        }

        $query = InventarioDotacion::where('proyecto', $proyecto)
            ->where('prenda', $prenda)
            ->where('talla', $talla)
            ->where(function ($q) use ($genero) {
                $q->where('genero', $genero)->orWhere('genero', 'Unisex');
            });

        $inv = $query->lockForUpdate()->first();

        if (!$inv) {
            Log::info("DotacionAutoPedidoService: no se encontró en inventario {$descripcion}, talla {$talla}.");
            return null;
        }

        if ($inv->cantidad < $cantidad) {
            Log::info("DotacionAutoPedidoService: stock insuficiente para {$descripcion}, talla {$talla} (disponible {$inv->cantidad}, solicitado {$cantidad}).");
            return null;
        }

        return $inv;
    }

    /**
     * Devuelve la lista de reglas (líneas de dotación) para el proyecto+cargo dados, o un
     * array vacío si el proyecto no es SYM/DIRECTV o el cargo no coincide con ninguna de
     * las reglas definidas (en cuyo caso no se genera ningún pedido automático).
     * Cada regla: ['proyecto','prenda','genero','talla'|null,'cantidad'].
     */
    private function resolverReglas(string $proyecto, string $cargo, string $genero, User $empleado): array
    {
        $reglas = [];

        $esSupervisorComercial = str_contains($cargo, 'SUPERVISOR COMERCIAL');
        $esAsesor              = str_contains($cargo, 'ASESOR');

        if ($proyecto === 'SYM ADMINISTRATIVO') {
            $reglas = array_merge($reglas, $this->kitAdministrativoSym($genero, $empleado));

        } elseif (in_array($proyecto, ['SYM TIGO EXPRESS', 'SYM TIGO HOME'], true)) {
            if ($esSupervisorComercial) {
                $reglas[] = ['SYM TIGO EXPRESS', 'Polo Mc Azul Tigo Express', $genero, $empleado->talla_camisa, 1];
                $reglas[] = ['SYM TIGO EXPRESS', 'Polo Mc Blanca Tigo Express', $genero, $empleado->talla_camisa, 1];
                $reglas[] = ['SYM TIGO EXPRESS', 'Carnet', 'Unisex', 'N/A', 1];
            } elseif ($esAsesor && $proyecto === 'SYM TIGO EXPRESS') {
                $reglas[] = ['SYM TIGO EXPRESS', 'Polo Mc Azul Tigo Express', $genero, $empleado->talla_camisa, 1];
                $reglas[] = ['SYM TIGO EXPRESS', 'Polo Mc Blanca Tigo Express', $genero, $empleado->talla_camisa, 1];
                $reglas[] = ['SYM TIGO EXPRESS', 'Carnet', 'Unisex', 'N/A', 1];
            } elseif ($esAsesor && $proyecto === 'SYM TIGO HOME') {
                $reglas[] = ['SYM TIGO HOME', 'Polo Ml Azul Home', $genero, $empleado->talla_camisa, 2];
                $reglas[] = ['SYM TIGO HOME', 'Gorra', 'Unisex', 'N/A', 1];
                $reglas[] = ['SYM TIGO HOME', 'Carnet', 'Unisex', 'N/A', 1];
            } else {
                // Cargo no comercial (ej. Analista, Coordinador) en un proyecto Tigo: recibe el
                // mismo kit que "personal administrativo" (proyecto Solo Ausentismos).
                $reglas = array_merge($reglas, $this->kitAdministrativoSym($genero, $empleado));
            }

        } elseif ($proyecto === 'DIRECTV') {
            if (in_array($cargo, self::DIRECTV_TECNICOS_INSTALADORES, true)) {
                $reglas[] = ['DIRECTV', 'Polo Instalador Azul Oscuro M/C', 'Unisex', $empleado->talla_camisa, 1];
                $reglas[] = ['DIRECTV', 'Polo Instalador Azul Oscuro M/L', 'Unisex', $empleado->talla_camisa, 1];
                $reglas[] = ['DIRECTV', 'Pantalon De Dril Tecnicos', 'Unisex', $empleado->talla_pantalon, 2];
                $reglas[] = ['DIRECTV', 'Botas Instalador', 'Unisex', $empleado->talla_zapatos, 1];
                $reglas[] = ['DIRECTV', 'Reata Azul Oscuro', 'Unisex', 'N/A', 1];
                $reglas[] = ['DIRECTV', 'Gorra', 'Unisex', 'N/A', 1];
                $reglas[] = ['DIRECTV', 'Carnet', 'Unisex', 'N/A', 1];
            } elseif (str_contains($cargo, 'LOGISTICA')) {
                $reglas[] = ['DIRECTV', 'Polo Gris Administrativa', $genero, $empleado->talla_camisa, 2];
                $reglas[] = ['DIRECTV', 'Pantalon Comercial', $genero, $empleado->talla_pantalon, 1];
                $reglas[] = ['DIRECTV', 'Botas Instalador', 'Unisex', $empleado->talla_zapatos, 1];
                $reglas[] = ['DIRECTV', 'Carnet', 'Unisex', 'N/A', 1];
            } elseif (str_contains($cargo, 'ADMINISTRATIVO') || str_contains($cargo, 'COMERCIAL')) {
                $reglas[] = ['DIRECTV', 'Polo Gris Administrativa', $genero, $empleado->talla_camisa, 2];
                $reglas[] = ['DIRECTV', 'Pantalon Comercial', $genero, $empleado->talla_pantalon, 1];
                $reglas[] = ['DIRECTV', 'Carnet', 'Unisex', 'N/A', 1];
            } else {
                Log::info("DotacionAutoPedidoService: cargo \"{$cargo}\" (proyecto DIRECTV) no coincide con Administrativo, Comercial, Logística ni Técnico instalador; no se genera pedido automático.");
            }
        } else {
            return [];
        }

        return $reglas;
    }

    /**
     * Kit de "personal administrativo" de SYM: 2 polos, 1 pantalón, 1 carnet, siempre
     * tomados del inventario de SYM ADMINISTRATIVO (proyecto real "Solo Ausentismos").
     * Se usa para el proyecto SYM ADMINISTRATIVO y también como kit por defecto para
     * cualquier cargo no comercial (ni Asesor ni Supervisor Comercial) dentro de Tigo
     * Express/Home.
     */
    private function kitAdministrativoSym(string $genero, User $empleado): array
    {
        return [
            ['SYM ADMINISTRATIVO', 'Polo Gris Manga Corta', $genero, $empleado->talla_camisa, 2],
            ['SYM ADMINISTRATIVO', 'Pantalon Administrativo', $genero, $empleado->talla_pantalon, 1],
            ['SYM ADMINISTRATIVO', 'Carnet', 'Unisex', 'N/A', 1],
        ];
    }

}
