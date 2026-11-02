<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Proveedor de Work Orders (no el de Compras) asociado a una sede, para la columna "Sede" del exporte.
class ProveedorWorkOrder extends Model
{
    protected $table = 'proveedores_work_orders';

    protected $fillable = ['sede_id', 'codigo', 'nombre'];

    public function sede()
    {
        return $this->belongsTo(Sede::class);
    }

    // El texto cambia según el archivo (en el catálogo viene sin ciudad); el código del inicio no.
    public static function codigoDe(string $proveedor): string
    {
        $limpio = mb_strtoupper(trim($proveedor), 'UTF-8');

        return preg_match('/^CO-I\d+/', $limpio, $m) ? $m[0] : $limpio;
    }
}
