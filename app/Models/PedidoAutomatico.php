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
        'estado',
        'recibido_pedidos',
        'estado_compra',
        'fecha_pedido',
        'notas',
    ];

    protected $casts = [
        'fecha_pedido'     => 'date',
        'recibido_pedidos' => 'boolean',
    ];

    public function empleado()
    {
        return $this->belongsTo(User::class, 'empleado_id');
    }

    public function contrato()
    {
        return $this->belongsTo(Contrato::class, 'contrato_id');
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
     * que no está aquí usa la dotación administrativa.
     */
    public const PROYECTO_A_INVENTARIO = [
        'TIGO EXPRESS' => 'SYM TIGO EXPRESS',
        'TIGO HOME'    => 'SYM TIGO HOME',
        'DIRECTV CO'   => 'DIRECTV',
        'DIRECTV ECU'  => 'DIRECTV',
    ];

    public static function proyectoInventarioDe(?string $proyectoContrato): ?string
    {
        $proyectoContrato = trim((string) $proyectoContrato);

        return $proyectoContrato === '' ? null : (self::PROYECTO_A_INVENTARIO[$proyectoContrato] ?? 'SYM ADMINISTRATIVO');
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

        $ajenas = InventarioDotacion::whereIn('id', array_column($items, 'inventario_dotacion_id'))
            ->where('proyecto', '!=', $proyecto)
            ->get(['prenda', 'proyecto']);

        return $ajenas->isEmpty() ? null
            : "El empleado es del proyecto {$contrato->cliente_proyecto}: solo se le puede asignar dotación de {$proyecto}. "
                . 'No corresponden: ' . $ajenas->map(fn ($i) => "{$i->prenda} ({$i->proyecto})")->implode(', ') . '.';
    }

    /** Todos los estados válidos de un pedido de dotación ("Activo" se muestra "En proceso"). */
    public const ESTADOS = ['Pendiente', 'Activo', 'Completado', 'Cancelado', 'Enviar a compras', 'Devolución', 'Devolución usada'];

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
            if ($antes) {
                $this->restaurarInventario();
            }
            $this->items()->delete();
            $items = $nuevo === 'Cancelado' ? [] : ($items ?? []);
            if ($despues) {
                $this->asignarItems($items);
            } else {
                foreach ($items as $item) {
                    $this->items()->create([
                        'inventario_dotacion_id' => $item['inventario_dotacion_id'],
                        'cantidad'               => $item['cantidad'],
                    ]);
                }
            }
        } elseif ($antes && !$despues) {
            $this->restaurarInventario();
        } elseif (!$antes && $despues) {
            $this->descontarItemsActuales();
        }

        $cambios = ['estado' => $nuevo];
        if ($nuevo === 'Cancelado') {
            $cambios['pedido_global_id'] = null;
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
            if ($inv->cantidad < $item->cantidad) {
                throw new InvalidArgumentException(
                    "Stock insuficiente para {$inv->prenda} {$inv->genero} T:{$inv->talla}. " .
                    "Disponible: {$inv->cantidad}, solicitado: {$item->cantidad}."
                );
            }
            $inv->decrement('cantidad', $item->cantidad);
        }
    }

    /** Devuelve al inventario las prendas del pedido. */
    public function restaurarInventario(): void
    {
        foreach ($this->items()->with('inventario')->get() as $item) {
            if ($item->inventario) {
                $item->inventario->increment('cantidad', $item->cantidad);
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

    public function asignarItems(array $items): void
    {
        foreach ($items as $item) {
            $inv = InventarioDotacion::lockForUpdate()->findOrFail($item['inventario_dotacion_id']);

            if ($inv->cantidad < $item['cantidad']) {
                throw new InvalidArgumentException(
                    "Stock insuficiente para {$inv->prenda} {$inv->genero} T:{$inv->talla}. " .
                    "Disponible: {$inv->cantidad}, solicitado: {$item['cantidad']}."
                );
            }

            $this->items()->create([
                'inventario_dotacion_id' => $item['inventario_dotacion_id'],
                'cantidad'               => $item['cantidad'],
            ]);

            $inv->decrement('cantidad', $item['cantidad']);
        }
    }
}
