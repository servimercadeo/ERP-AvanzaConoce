<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PedidoCompraItem extends Model
{
    protected $table = 'pedido_compra_items';

    protected $fillable = [
        'pedido_compra_id',
        'producto',
        'tipo_producto_id',
        'cantidad',
        'estado_revision',
        'observacion',
        'seriales',
        'orden_compra_id',
    ];

    public function pedido()
    {
        return $this->belongsTo(PedidoCompra::class, 'pedido_compra_id');
    }

    public function tipoProducto()
    {
        return $this->belongsTo(TipoProducto::class);
    }

    public function ordenCompra()
    {
        return $this->belongsTo(OrdenCompra::class);
    }
}
