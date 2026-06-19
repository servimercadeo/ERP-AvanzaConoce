<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class PedidoGlobal extends Model
{
    protected $table = 'pedidos_globales';

    protected $fillable = ['codigo', 'fecha', 'total_pedidos', 'notas'];

    protected $casts = ['fecha' => 'date'];

    public function pedidosAutomaticos()
    {
        return $this->hasMany(PedidoAutomatico::class);
    }

    public static function generarCodigo(): string
    {
        $max = DB::table('pedidos_globales')
            ->selectRaw('MAX(CAST(codigo AS UNSIGNED)) as max_c')
            ->value('max_c') ?? 0;

        return str_pad((int)$max + 1, 5, '0', STR_PAD_LEFT);
    }
}
