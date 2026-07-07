<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventarioDotacion extends Model
{
    use HasFactory;

    protected $table = 'inventario_dotacion';

    protected $fillable = [
        'proyecto',
        'categoria',
        'subcategoria',
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
}
