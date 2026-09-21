<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CategoriaProducto extends Model
{
    protected $table = 'categorias_producto';
    protected $fillable = ['nombre'];

    // Categorías con módulo de inventario propio ya construido a mano, o con su propio
    // sistema aparte (Dotación): crear/editar/borrar estas NO genera ni quita un
    // submódulo de inventario automático (ver useErpModules.js en el frontend).
    public const CATEGORIAS_CON_MODULO_PROPIO = ['Activos', 'Materiales', 'Equipos', 'Dotación', 'EPP', 'Herramientas'];
}
