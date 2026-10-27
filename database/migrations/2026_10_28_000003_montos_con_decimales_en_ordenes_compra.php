<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Los precios de las órdenes de compra pueden traer centavos (ej. 150,50): los montos
     * pasan de entero a decimal(15,2). Los valores enteros existentes se conservan tal cual.
     * Volver a correrla no cambia nada (ya son decimal).
     */
    private const COLUMNAS = [
        'ordenes_compra'     => ['valor_transporte', 'subtotal', 'iva_total', 'valor_total'],
        'orden_compra_items' => ['precio_unitario', 'subtotal', 'iva_valor', 'total'],
    ];

    public function up(): void
    {
        foreach (self::COLUMNAS as $tabla => $columnas) {
            Schema::table($tabla, function (Blueprint $table) use ($columnas) {
                foreach ($columnas as $columna) {
                    $table->decimal($columna, 15, 2)->default(0)->change();
                }
            });
        }
    }

    public function down(): void
    {
        foreach (self::COLUMNAS as $tabla => $columnas) {
            Schema::table($tabla, function (Blueprint $table) use ($columnas) {
                foreach ($columnas as $columna) {
                    $table->unsignedBigInteger($columna)->default(0)->change();
                }
            });
        }
    }
};
