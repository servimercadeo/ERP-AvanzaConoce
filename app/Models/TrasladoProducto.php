<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrasladoProducto extends Model
{
    protected $table = 'traslados_producto';

    protected $fillable = [
        'pedido_compra_id',
        'pedido_compra_item_id',
        'inventario_producto_origen_id',
        'sede_destino_id',
        'producto',
        'cantidad',
        'seriales',
        'estado',
        'solicitado_por',
        'aprobado_por',
        'aprobado_en',
    ];

    protected $casts = [
        'cantidad'    => 'integer',
        'aprobado_en' => 'datetime',
    ];

    public function pedido()
    {
        return $this->belongsTo(PedidoCompra::class, 'pedido_compra_id');
    }

    public function item()
    {
        return $this->belongsTo(PedidoCompraItem::class, 'pedido_compra_item_id');
    }

    public function origen()
    {
        return $this->belongsTo(InventarioProducto::class, 'inventario_producto_origen_id');
    }

    public function sedeDestino()
    {
        return $this->belongsTo(Sede::class, 'sede_destino_id');
    }
}
