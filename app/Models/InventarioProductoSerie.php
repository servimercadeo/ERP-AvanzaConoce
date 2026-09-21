<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventarioProductoSerie extends Model
{
    protected $table = 'inventario_producto_series';

    protected $fillable = ['inventario_producto_id', 'serial'];

    public function inventarioProducto()
    {
        return $this->belongsTo(InventarioProducto::class);
    }
}
