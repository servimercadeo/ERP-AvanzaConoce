<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class PedidoAutomatico extends Model
{
    protected $table = 'pedidos_automaticos';

    protected $fillable = [
        'codigo',
        'contrato_id',
        'pedido_global_id',
        'empleado_id',
        'estado',
        'fecha_pedido',
        'notas',
    ];

    protected $casts = [
        'fecha_pedido' => 'date',
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

    public static function generarCodigo(): string
    {
        $max = DB::table('pedidos_automaticos')
            ->selectRaw('MAX(CAST(codigo AS UNSIGNED)) as max_c')
            ->value('max_c') ?? 0;

        return str_pad((int)$max + 1, 5, '0', STR_PAD_LEFT);
    }
}
