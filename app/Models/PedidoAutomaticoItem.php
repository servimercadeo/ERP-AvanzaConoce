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
    ];

    protected $casts = [
        'cantidad' => 'integer',
    ];

    public function pedido()
    {
        return $this->belongsTo(PedidoAutomatico::class, 'pedido_automatico_id');
    }

    public function inventario()
    {
        return $this->belongsTo(InventarioDotacion::class, 'inventario_dotacion_id');
    }
}
