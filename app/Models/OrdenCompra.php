<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrdenCompra extends Model
{
    protected $table = 'ordenes_compra';

    protected $fillable = [
        'codigo',
        'fecha_registro',
        'sede_id',
        'empresa_id',
        'proveedor_id',
        'naturaleza',
        'forma_pago_id',
        'fecha_entrega',
        'observaciones',
        'valor_transporte',
        'subtotal',
        'iva_total',
        'valor_total',
        'estado',
        'creado_por',
    ];

    protected $casts = [
        'fecha_registro'   => 'datetime',
        'fecha_entrega'    => 'date',
        'valor_transporte' => 'integer',
        'subtotal'         => 'integer',
        'iva_total'        => 'integer',
        'valor_total'      => 'integer',
    ];

    public static function generarCodigo(): string
    {
        $ultimo = static::query()
            ->selectRaw("MAX(CAST(SUBSTRING(codigo, 4) AS UNSIGNED)) as max_num")
            ->value('max_num');

        return 'OC-' . str_pad((string) (($ultimo ?? 0) + 1), 3, '0', STR_PAD_LEFT);
    }

    public function sede()
    {
        return $this->belongsTo(Sede::class);
    }

    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }

    public function proveedor()
    {
        return $this->belongsTo(Proveedor::class);
    }

    public function formaPago()
    {
        return $this->belongsTo(FormaPago::class);
    }

    public function items()
    {
        return $this->hasMany(OrdenCompraItem::class);
    }
}
