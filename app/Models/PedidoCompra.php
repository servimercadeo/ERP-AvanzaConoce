<?php

namespace App\Models;

use App\Models\Concerns\HasSedeCatalogo;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class PedidoCompra extends Model
{
    use HasSedeCatalogo;

    protected $table = 'pedidos_compra';

    protected $fillable = [
        'codigo',
        'fecha_registro',
        'tipo_responsable',
        'responsable',
        'sede',
        'sede_id',
        'clase',
        'concepto',
        'estado',
        'estado_compra',
        'registra',
    ];

    protected $casts = [
        'fecha_registro' => 'date:Y-m-d',
    ];

    public function items()
    {
        return $this->hasMany(PedidoCompraItem::class);
    }

    public static function generarCodigo(): string
    {
        $max = DB::table('pedidos_compra')
            ->selectRaw('MAX(CAST(SUBSTRING(codigo, 5) AS UNSIGNED)) as max_c')
            ->value('max_c') ?? 0;

        return 'PED-' . str_pad((string) ((int) $max + 1), 3, '0', STR_PAD_LEFT);
    }
}
