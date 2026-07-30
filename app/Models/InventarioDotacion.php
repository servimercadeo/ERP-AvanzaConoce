<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventarioDotacion extends Model
{
    use HasFactory;

    protected $table = 'inventario_dotacion';

    /**
     * Proyecto de dotación => nombre exacto en la tabla `proyectos`. Fuente única de verdad
     * para resolver qué sedes aplican a cada proyecto de dotación vía el pivote proyecto_sede
     * (usado por InventarioDotacionController y por InventarioDotacionSeeder).
     */
    public const PROYECTO_DOTACION_A_PROYECTO = [
        'SYM TIGO EXPRESS'   => 'TIGO EXPRESS',
        'SYM TIGO HOME'      => 'TIGO HOME',
        'SYM ADMINISTRATIVO' => 'ADMINISTRATIVO',
        'DIRECTV'            => 'DIRECTV CO',
    ];

    protected $fillable = [
        'proyecto',
        'sede_id',
        'prenda',
        'genero',
        'talla',
        'precio',
        'cantidad',
        'stock_minimo',
    ];

    protected $casts = [
        'precio' => 'integer',
        'cantidad' => 'integer',
        'stock_minimo' => 'integer',
    ];

    public function sede()
    {
        return $this->belongsTo(Sede::class);
    }
}
