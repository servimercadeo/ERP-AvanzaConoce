<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AsignacionInventario extends Model
{
    protected $table = 'asignaciones_inventario';

    protected $fillable = [
        'inventario_producto_id',
        'user_id',
        'serial',
        'cantidad',
        'fecha_asignacion',
        'fecha_devolucion',
        'observacion',
        'asignado_por',
    ];

    protected $casts = [
        'cantidad'         => 'integer',
        'fecha_asignacion' => 'date:Y-m-d',
        'fecha_devolucion' => 'date:Y-m-d',
    ];

    public function inventarioProducto()
    {
        return $this->belongsTo(InventarioProducto::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
