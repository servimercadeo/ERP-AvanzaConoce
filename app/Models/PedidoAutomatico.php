<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PedidoAutomatico extends Model
{
    use HasFactory;

    protected $table = 'pedidos_automaticos';

    protected $fillable = [
        'sede',
        'cedula',
        'nombres',
        'apellidos',
        'cargo',
        'tipo_contrato',
        'proceso',
        'fecha_ingreso',
        'estado_contrato',
        'empleador',
        'proyecto',
        'genero',
        'ciudad',
        'polo_masculino_talla',
        'polo_masculino_cantidad',
        'polo_femenino_talla',
        'polo_femenino_cantidad',
        'jean_masculino_talla',
        'jean_masculino_cantidad',
        'jean_femenino_talla',
        'jean_femenino_cantidad',
        'chaqueta_masculino_talla',
        'chaqueta_masculino_cantidad',
        'chaqueta_femenino_talla',
        'chaqueta_femenino_cantidad',
        'tenis_masculino_talla',
        'tenis_masculino_cantidad',
        'tenis_femenino_talla',
        'tenis_femenino_cantidad',
        'estado_acta',
        'actas_sept',
        'fecha_segunda_renovacion_2025',
        'fecha_primera_renovacion_2024',
        'fecha_segunda_renovacion_2024',
        'fecha_tercera_renovacion_2024',
        'fecha_primera_renovacion_2025',
        'pedido_inicial',
        'fecha_inicial',
        'pedido_renovacion_1',
        'fecha_renovacion_1',
        'pedido_renovacion_2',
        'fecha_renovacion_2',
        'pedido_renovacion_3',
        'fecha_renovacion_3',
        'pedido_renovacion_4',
        'fecha_renovacion_4',
        'pedido_renovacion_5',
        'fecha_renovacion_5',
        'inventario_descontado',
    ];

    protected $casts = [
        'inventario_descontado' => 'boolean',
        'fecha_ingreso' => 'date:Y-m-d',
        'fecha_segunda_renovacion_2025' => 'date:Y-m-d',
        'fecha_primera_renovacion_2024' => 'date:Y-m-d',
        'fecha_segunda_renovacion_2024' => 'date:Y-m-d',
        'fecha_tercera_renovacion_2024' => 'date:Y-m-d',
        'fecha_primera_renovacion_2025' => 'date:Y-m-d',
        'fecha_inicial' => 'date:Y-m-d',
    ];
}
