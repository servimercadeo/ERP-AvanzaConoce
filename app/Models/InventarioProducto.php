<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventarioProducto extends Model
{
    protected $table = 'inventario_productos';

    protected $fillable = [
        'tipo_producto_id',
        'sede_id',
        'precio',
        'cantidad',
        'stock_minimo',
    ];

    protected $casts = [
        'precio'       => 'integer',
        'cantidad'     => 'integer',
        'stock_minimo' => 'integer',
    ];

    public function tipoProducto()
    {
        return $this->belongsTo(TipoProducto::class);
    }

    public function sede()
    {
        return $this->belongsTo(Sede::class);
    }
}
