<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PedidoAutomaticoItem extends Model
{
    protected $table = 'pedido_automatico_items';

    protected $fillable = [
        'pedido_automatico_id',
        'inventario_dotacion_id',
        'cantidad',
        'cantidad_por_comprar',
        'orden_compra_id',
        'estado_revision',
        'observacion',
    ];

    protected $casts = [
        'cantidad' => 'integer',
        'cantidad_por_comprar' => 'integer',
    ];

    /** Lo que sí sale del inventario: el resto no había y hay que comprarlo. */
    public function cantidadEnStock(): int
    {
        return $this->cantidad - $this->cantidad_por_comprar;
    }

    public function pedido()
    {
        return $this->belongsTo(PedidoAutomatico::class, 'pedido_automatico_id');
    }

    public function inventario()
    {
        return $this->belongsTo(InventarioDotacion::class, 'inventario_dotacion_id');
    }
}
