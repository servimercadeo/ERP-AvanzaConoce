<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrdenCompraItem extends Model
{
    protected $table = 'orden_compra_items';

    protected $fillable = [
        'orden_compra_id',
        'pedido_compra_item_id',
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
        'precio_unitario' => 'integer',
        'iva_porcentaje'  => 'integer',
        'subtotal'        => 'integer',
        'iva_valor'       => 'integer',
        'total'           => 'integer',
    ];

    public function ordenCompra()
    {
        return $this->belongsTo(OrdenCompra::class);
    }

    public function pedidoCompraItem()
    {
        return $this->belongsTo(PedidoCompraItem::class);
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
