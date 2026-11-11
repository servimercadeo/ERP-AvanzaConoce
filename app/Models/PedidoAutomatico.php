<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PedidoAutomatico extends Model
{
    protected $table = 'pedidos_automaticos';

    protected $fillable = [
        'codigo',
        'contrato_id',
        'pedido_global_id',
        'empleado_id',
        'sede_id',
        'estado',
        'recibido_pedidos',
        'estado_compra',
        'fecha_pedido',
        'notas',
        'prendas_sin_definir',
    ];

    protected $casts = [
        'fecha_pedido'        => 'date',
        'recibido_pedidos'    => 'boolean',
        'prendas_sin_definir' => 'array',
    ];

    public function empleado()
    {
        return $this->belongsTo(User::class, 'empleado_id');
    }

    public function contrato()
    {
        return $this->belongsTo(Contrato::class, 'contrato_id');
    }

    /** Sede de la que sale el pedido (de su inventario se descuentan las prendas). */
    public function sede()
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    public function items()
    {
        return $this->hasMany(PedidoAutomaticoItem::class, 'pedido_automatico_id');
    }

    public function pedidoGlobal()
    {
        return $this->belongsTo(PedidoGlobal::class);
    }

    /**
     * Proyecto del contrato (tabla `proyectos`) => proyecto del inventario de dotación. Lo
     * que no está aquí usa la dotación administrativa. HUGHES y FT&H no tienen inventario
     * propio: usan la dotación de técnico de DIRECTV. Igual en PedidosAutomaticosCrud.jsx
     * (utils/dotacion.js).
     */
    public const PROYECTO_A_INVENTARIO = [
        'TIGO EXPRESS' => 'SYM TIGO EXPRESS',
        'TIGO HOME'    => 'SYM TIGO HOME',
        'DIRECTV'      => 'DIRECTV',
        'DIRECTV ECU'  => 'DIRECTV',
        'HUGHES COL'   => 'DIRECTV',
        'HUGHES ECU'   => 'DIRECTV',
        'FT&H'         => 'DIRECTV',
    ];

    /**
     * Otros inventarios cuyas prendas hacen parte del kit del proyecto (DotacionAutoPedidoService):
     * el carnet y la gorra de Tigo salen de SYM ADMINISTRATIVO. Sin esto no se podría editar su
     * propio pedido.
     */
    private const INVENTARIOS_DEL_KIT = [
        'SYM TIGO EXPRESS' => ['SYM ADMINISTRATIVO'],
        'SYM TIGO HOME'    => ['SYM ADMINISTRATIVO'],
    ];

    /** Marca (al inicio de las notas) de los pedidos creados por DotacionAutoPedidoService. */
    public const NOTA_AUTOMATICO = 'Generado automáticamente';

    public static function proyectoInventarioDe(?string $proyectoContrato): ?string
    {
        // Con su nombre actual: un contrato viejo puede traer "DIRECTV CO" o "DIRECTV COL".
        $proyectoContrato = \App\Services\EmpresaProyectoRules::nombreActual($proyectoContrato);

        return $proyectoContrato === '' ? null : (self::PROYECTO_A_INVENTARIO[$proyectoContrato] ?? 'SYM ADMINISTRATIVO');
    }

    /**
     * El contrato al que queda ligado un pedido: el indicado si es de ese empleado o, si no,
     * su vigente (el activo más reciente). Null si el empleado no tiene contrato.
     */
    public static function contratoDelEmpleado(int $empleadoId, ?int $contratoId = null): ?Contrato
    {
        $indicado = $contratoId ? Contrato::where('empleado_id', $empleadoId)->find($contratoId) : null;

        return $indicado ?? Contrato::where('empleado_id', $empleadoId)
            // "Vigente" (antes "Activo", ver migración renombrar_estados_contrato).
            ->orderByRaw("estado_contrato IN ('Vigente', 'Activo') DESC")
            ->orderByDesc('fecha_ingreso')->orderByDesc('id')
            ->first();
    }

    /**
     * Mensaje de error si alguna prenda no es del proyecto del contrato del empleado (ej. a
     * un empleado de DIRECTV no se le asigna dotación de TIGO), o null si todas lo son.
     *
     * @param  array<int, array{inventario_dotacion_id: int}>  $items
     */
    public static function prendasDeOtroProyecto(?Contrato $contrato, array $items): ?string
    {
        $proyecto = self::proyectoInventarioDe($contrato?->cliente_proyecto);
        if (!$proyecto || !$items) {
            return null;
        }

        $permitidos = [$proyecto, ...(self::INVENTARIOS_DEL_KIT[$proyecto] ?? [])];
        $ajenas = InventarioDotacion::whereIn('id', array_column($items, 'inventario_dotacion_id'))
            ->whereNotIn('proyecto', $permitidos)
            ->get(['prenda', 'proyecto']);

        return $ajenas->isEmpty() ? null
            : "El empleado es del proyecto {$contrato->cliente_proyecto}: solo se le puede asignar dotación de " . implode(' o ', $permitidos) . '. '
                . 'No corresponden: ' . $ajenas->map(fn ($i) => "{$i->prenda} ({$i->proyecto})")->implode(', ') . '.';
    }

    /** Todos los estados válidos de un pedido de dotación ("Activo" se muestra "En proceso"). */
    public const ESTADOS = ['Pendiente', 'Activo', 'Completado', 'Cancelado', 'Enviar a compras', 'Devolución', 'Devolución usada'];

    public const ENVIAR_A_COMPRAS = 'Enviar a compras';

    public const SOLO_DESDE_GLOBAL = 'A Compras solo se envía desde Pedidos globales: primero incluye el pedido en un pedido global.';

    /** A Compras se llega únicamente desde un pedido global. */
    public function exigirGlobalParaCompras(string $nuevo): void
    {
        if ($nuevo === self::ENVIAR_A_COMPRAS && $this->estado !== $nuevo && !$this->pedido_global_id) {
            throw new InvalidArgumentException("Pedido {$this->codigo}: " . self::SOLO_DESDE_GLOBAL);
        }
    }

    /** A dónde vuelve al salir de Compras: Completado si está en un pedido global, si no en proceso. */
    public function estadoAlSalirDeCompras(): string
    {
        return $this->pedido_global_id ? 'Completado' : 'Activo';
    }

    /** Cómo entra un pedido a la pantalla de Compras. */
    public const EN_COMPRAS = ['recibido_pedidos' => true, 'estado_compra' => 'Cotizando'];

    /** Estados con las prendas ya entregadas: no se anulan (el stock no vuelve). */
    public const ESTADOS_ENTREGADOS = ['Completado', 'Devolución', 'Devolución usada'];

    /**
     * Estados en los que las prendas están FUERA del inventario (descontadas). En los demás
     * (Pendiente, Cancelado, Devolución) están dentro. Cambiar de un grupo al otro mueve el
     * stock; dentro del mismo grupo no se toca.
     */
    public const ESTADOS_CON_STOCK_DESCONTADO = ['Activo', 'Completado', 'Enviar a compras', 'Devolución usada'];

    public static function descuentaStock(?string $estado): bool
    {
        return in_array($estado, self::ESTADOS_CON_STOCK_DESCONTADO, true);
    }

    /**
     * Cambia el estado (y opcionalmente las prendas) dejando el inventario cuadrado:
     * - Con prendas nuevas: se devuelven las anteriores (si estaban descontadas) y se
     *   descuentan las nuevas (si el nuevo estado descuenta).
     * - Solo el estado: se devuelven o descuentan las prendas actuales al pasar de un grupo
     *   al otro, sin recrearlas (conservan su revisión de stock).
     * - Cancelado: las prendas se quitan del pedido y se desvincula del pedido global.
     * Lanza InvalidArgumentException si no hay stock suficiente (el llamador revierte).
     *
     * @param  array<int, array{inventario_dotacion_id: int, cantidad: int}>|null  $items
     */
    public function cambiarEstado(string $nuevo, ?array $items = null): void
    {
        $antes = self::descuentaStock($this->estado);
        $despues = self::descuentaStock($nuevo);

        if ($items !== null || $nuevo === 'Cancelado') {
            // Lo que estaba por comprar lo sigue estando (editar el pedido no exige ese stock), y lo
            // que ya está en una orden de compra sigue ahí: si no, se volvería a comprar.
            $porComprar = $this->items()->pluck('cantidad_por_comprar', 'inventario_dotacion_id')->all();
            $enOrden = $this->items()->pluck('orden_compra_id', 'inventario_dotacion_id')->all();
            if ($antes) {
                $this->restaurarInventario();
            }
            $this->items()->delete();
            $items = $nuevo === 'Cancelado' ? [] : ($items ?? []);
            if ($despues) {
                $this->asignarItems($items, $porComprar, $enOrden);
            } else {
                foreach ($items as $item) {
                    $sinStock = min($porComprar[$item['inventario_dotacion_id']] ?? 0, $item['cantidad']);
                    $this->items()->create([
                        'inventario_dotacion_id' => $item['inventario_dotacion_id'],
                        'cantidad'               => $item['cantidad'],
                        'cantidad_por_comprar'   => $sinStock,
                        'orden_compra_id'        => $sinStock > 0 ? ($enOrden[$item['inventario_dotacion_id']] ?? null) : null,
                    ]);
                }
            }
        } elseif ($antes && !$despues) {
            $this->restaurarInventario();
        } elseif (!$antes && $despues) {
            $this->descontarItemsActuales();
        }

        $cambios = ['estado' => $nuevo];
        // Lo que se agregó a mano ya no está sin definir.
        if ($items !== null && $this->prendas_sin_definir) {
            $agregadas = InventarioDotacion::whereIn('id', array_column($items, 'inventario_dotacion_id'))->pluck('prenda')->all();
            // Por nombre del kit: en el inventario puede estar como "CAMISA COMERCIAL DAMA".
            $cambios['prendas_sin_definir'] = array_values(array_filter(
                $this->prendas_sin_definir,
                fn ($prenda) => !collect($agregadas)->contains(fn ($a) => \App\Services\DotacionAutoPedidoService::esLaPrenda($prenda, $a)),
            )) ?: null;
        }
        if ($nuevo === 'Cancelado') {
            $cambios['pedido_global_id'] = null;
        }
        // "Enviar a compras" lo lleva directo a la pantalla de Compras; al salir de ese estado
        // deja de estar allá.
        if ($nuevo !== self::ENVIAR_A_COMPRAS) {
            $cambios += ['recibido_pedidos' => false, 'estado_compra' => null];
        } elseif ($this->estado !== self::ENVIAR_A_COMPRAS || !$this->recibido_pedidos) {
            $cambios += self::EN_COMPRAS;
        }
        $this->update($cambios);
    }

    /** Descuenta del inventario las prendas que ya tiene el pedido (sin recrearlas). */
    private function descontarItemsActuales(): void
    {
        foreach ($this->items()->get() as $item) {
            $inv = InventarioDotacion::lockForUpdate()->find($item->inventario_dotacion_id);
            if (!$inv) {
                continue;
            }
            $enStock = $item->cantidadEnStock();
            if ($inv->cantidad < $enStock) {
                throw new InvalidArgumentException(
                    "Stock insuficiente para {$inv->prenda} {$inv->genero} T:{$inv->talla}. " .
                    "Disponible: {$inv->cantidad}, solicitado: {$enStock}."
                );
            }
            $inv->decrement('cantidad', $enStock);
        }
    }

    /** Devuelve al inventario las prendas del pedido. */
    public function restaurarInventario(): void
    {
        foreach ($this->items()->with('inventario')->get() as $item) {
            if ($item->inventario) {
                $item->inventario->increment('cantidad', $item->cantidadEnStock());
            }
        }
    }

    /**
     * Un pedido de dotación es para un empleado con contrato. Anula (devuelve las prendas
     * al inventario) y elimina los pedidos no entregados de quien no tiene ningún contrato
     * (contrato borrado, empleado borrado o pedido huérfano). Los entregados se conservan.
     *
     * @param  int|null  $empleadoId  solo los de ese empleado; null = todos.
     * @param  bool  $aunqueTengaContrato  para cuando el empleado mismo se está borrando.
     * @return int  pedidos eliminados
     */
    public static function anularSinContrato(?int $empleadoId = null, bool $aunqueTengaContrato = false): int
    {
        $pedidos = static::query()
            ->whereNotIn('estado', self::ESTADOS_ENTREGADOS)
            ->when($empleadoId !== null, fn ($q) => $q->where('empleado_id', $empleadoId))
            ->when(!$aunqueTengaContrato, fn ($q) => $q->where(fn ($q) => $q
                ->whereNull('empleado_id')
                ->orWhereDoesntHave('empleado.contratos')))
            ->get();

        foreach ($pedidos as $pedido) {
            DB::transaction(function () use ($pedido) {
                if (in_array($pedido->estado, self::ESTADOS_CON_STOCK_DESCONTADO, true)) {
                    $pedido->restaurarInventario();
                }
                $pedido->items()->delete();
                $pedido->delete();
            });
        }

        return $pedidos->count();
    }

    public static function generarCodigo(): string
    {
        $max = DB::table('pedidos_automaticos')
            ->selectRaw('MAX(CAST(codigo AS UNSIGNED)) as max_c')
            ->value('max_c') ?? 0;

        return str_pad((int)$max + 1, 5, '0', STR_PAD_LEFT);
    }

    /**
     * @param array<int, int> $porComprar por fila de inventario, lo que no se exige en stock
     * @param array<int, int|null> $enOrden por fila de inventario, la orden de compra que ya la incluye
     */
    public function asignarItems(array $items, array $porComprar = [], array $enOrden = []): void
    {
        foreach ($items as $item) {
            $inv = InventarioDotacion::lockForUpdate()->findOrFail($item['inventario_dotacion_id']);
            $sinStock = min($porComprar[$item['inventario_dotacion_id']] ?? 0, $item['cantidad']);
            $enStock = $item['cantidad'] - $sinStock;

            if ($inv->cantidad < $enStock) {
                throw new InvalidArgumentException(
                    "Stock insuficiente para {$inv->prenda} {$inv->genero} T:{$inv->talla}. " .
                    "Disponible: {$inv->cantidad}, solicitado: {$enStock}."
                );
            }

            $this->items()->create([
                'inventario_dotacion_id' => $item['inventario_dotacion_id'],
                'cantidad'               => $item['cantidad'],
                'cantidad_por_comprar'   => $sinStock,
                'orden_compra_id'        => $sinStock > 0 ? ($enOrden[$item['inventario_dotacion_id']] ?? null) : null,
            ]);

            $inv->decrement('cantidad', $enStock);
        }
    }
}
