<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrasladoDotacion extends Model
{
    protected $table = 'traslados_dotacion';

    protected $fillable = [
        'pedido_automatico_id',
        'pedido_automatico_item_id',
        'inventario_dotacion_origen_id',
        'sede_destino_id',
        'prenda',
        'genero',
        'talla',
        'cantidad',
        'estado',
        'solicitado_por',
    ];

    protected $casts = [
        'cantidad' => 'integer',
    ];

    public function pedido()
    {
        return $this->belongsTo(PedidoAutomatico::class, 'pedido_automatico_id');
    }

    public function item()
    {
        return $this->belongsTo(PedidoAutomaticoItem::class, 'pedido_automatico_item_id');
    }

    public function origen()
    {
        return $this->belongsTo(InventarioDotacion::class, 'inventario_dotacion_origen_id');
    }

    public function sedeDestino()
    {
        return $this->belongsTo(Sede::class, 'sede_destino_id');
    }
}
