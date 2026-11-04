<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrdenCompraItem extends Model
{
    protected $table = 'orden_compra_items';

    /** Categoría con la que las prendas de dotación aparecen en la orden. */
    public const CATEGORIA_DOTACION = 'Dotación';

    protected $fillable = [
        'orden_compra_id',
        'pedido_compra_item_id',
        'pedido_automatico_id',
        'inventario_dotacion_id',
        'tipo_producto_id',
        'producto',
        'categoria',
        'empresa_id',
        'cantidad',
        'precio_unitario',
        'iva_porcentaje',
        'subtotal',
        'iva_valor',
        'total',
    ];

    protected $casts = [
        'cantidad'        => 'integer',
        'precio_unitario' => \App\Casts\Monto::class,
        'iva_porcentaje'  => 'integer',
        'subtotal'        => \App\Casts\Monto::class,
        'iva_valor'       => \App\Casts\Monto::class,
        'total'           => \App\Casts\Monto::class,
    ];

    public function ordenCompra()
    {
        return $this->belongsTo(OrdenCompra::class);
    }

    public function pedidoCompraItem()
    {
        return $this->belongsTo(PedidoCompraItem::class);
    }

    public function pedidoAutomatico()
    {
        return $this->belongsTo(PedidoAutomatico::class);
    }

    public function inventarioDotacion()
    {
        return $this->belongsTo(InventarioDotacion::class);
    }

    public function tipoProducto()
    {
        return $this->belongsTo(TipoProducto::class);
    }

    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }
}
