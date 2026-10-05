<?php

namespace App\Models;

use App\Traits\RegistraAuditoria;
use Illuminate\Database\Eloquent\Model;

class InventarioProducto extends Model
{
    use RegistraAuditoria;

    protected $table = 'inventario_productos';

    public function auditoriaProceso(): string
    {
        return 'Inventario';
    }

    public function auditoriaNombreRegistro(): string
    {
        return $this->tipoProducto?->nombre ?? ('#' . $this->id);
    }

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
