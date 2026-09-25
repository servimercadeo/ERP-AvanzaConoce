<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventarioProducto extends Model
{
    protected $table = 'inventario_productos';

    protected $fillable = [
        'tipo_producto_id',
        'sede_id',
        'talla',
        'empresa_id',
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

    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }

    public function series()
    {
        return $this->hasMany(InventarioProductoSerie::class);
    }

    public function asignaciones()
    {
        return $this->hasMany(AsignacionInventario::class);
    }
}
