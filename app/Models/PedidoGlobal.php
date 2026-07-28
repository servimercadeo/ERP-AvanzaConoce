<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class PedidoGlobal extends Model
{
    protected $table = 'pedidos_globales';

    protected $fillable = ['codigo', 'fecha', 'total_pedidos', 'notas', 'confirmado', 'confirmado_at', 'entrega_confirmada', 'entrega_confirmada_at', 'cliente_proyecto', 'regional_id'];

    protected $casts = [
        'fecha' => 'date',
        'confirmado' => 'boolean',
        'confirmado_at' => 'datetime',
        'entrega_confirmada' => 'boolean',
        'entrega_confirmada_at' => 'datetime',
    ];

    public function pedidosAutomaticos()
    {
        return $this->hasMany(PedidoAutomatico::class);
    }

    public function regional()
    {
        return $this->belongsTo(Regional::class);
    }

    public static function generarCodigo(): string
    {
        $max = DB::table('pedidos_globales')
            ->selectRaw('MAX(CAST(codigo AS UNSIGNED)) as max_c')
            ->value('max_c') ?? 0;

        return str_pad((int)$max + 1, 5, '0', STR_PAD_LEFT);
    }
}
