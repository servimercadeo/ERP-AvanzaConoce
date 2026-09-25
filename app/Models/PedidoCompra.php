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
        'empresa_id',
        'sede',
        'sede_id',
        'clase',
        'concepto',
        'estado',
        'estado_compra',
        'registra',
        'asignado_a_user_id',
    ];

    protected $casts = [
        'fecha_registro' => 'date:Y-m-d',
    ];

    public function items()
    {
        return $this->hasMany(PedidoCompraItem::class);
    }

    public function asignadoA()
    {
        return $this->belongsTo(User::class, 'asignado_a_user_id');
    }

    /**
     * Empresa del EMPLEADO para quien se creó el pedido (resuelta y guardada una sola
     * vez al crear el pedido, ver PedidoCompraController::store()) — snapshot, no una
     * relación en vivo: si el empleado cambia de empresa después, este pedido histórico
     * no debe cambiar. De aquí sale la trazabilidad hacia la Orden de Compra y el Acta
     * de Entrega.
     */
    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }

    public static function generarCodigo(): string
    {
        $max = DB::table('pedidos_compra')
            ->selectRaw('MAX(CAST(SUBSTRING(codigo, 5) AS UNSIGNED)) as max_c')
            ->value('max_c') ?? 0;

        return 'PED-' . str_pad((string) ((int) $max + 1), 3, '0', STR_PAD_LEFT);
    }
}
