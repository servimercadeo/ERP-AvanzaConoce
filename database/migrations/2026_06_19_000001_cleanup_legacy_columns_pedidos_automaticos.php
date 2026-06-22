<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Eliminar registros legacy (sin codigo ni empleado_id)
        DB::table('pedidos_automaticos')
            ->whereNull('codigo')
            ->delete();

        Schema::table('pedidos_automaticos', function (Blueprint $table) {
            $table->dropColumn([
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
                'inventario_descontado',
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
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('pedidos_automaticos', function (Blueprint $table) {
            $table->string('sede', 180)->nullable();
            $table->string('cedula', 30)->nullable();
            $table->string('nombres', 150)->nullable();
            $table->string('apellidos', 150)->nullable();
            $table->string('cargo', 150)->nullable();
            $table->string('tipo_contrato', 80)->nullable();
            $table->string('proceso', 80)->nullable();
            $table->date('fecha_ingreso')->nullable();
            $table->string('estado_contrato', 80)->nullable();
            $table->string('empleador', 150)->nullable();
            $table->string('proyecto', 120)->nullable();
            $table->string('genero', 30)->nullable();
            $table->string('ciudad', 120)->nullable();
            $table->string('polo_masculino_talla', 20)->nullable();
            $table->unsignedSmallInteger('polo_masculino_cantidad')->nullable();
            $table->string('polo_femenino_talla', 20)->nullable();
            $table->unsignedSmallInteger('polo_femenino_cantidad')->nullable();
            $table->string('jean_masculino_talla', 20)->nullable();
            $table->unsignedSmallInteger('jean_masculino_cantidad')->nullable();
            $table->string('jean_femenino_talla', 20)->nullable();
            $table->unsignedSmallInteger('jean_femenino_cantidad')->nullable();
            $table->string('chaqueta_masculino_talla', 20)->nullable();
            $table->unsignedSmallInteger('chaqueta_masculino_cantidad')->nullable();
            $table->string('chaqueta_femenino_talla', 20)->nullable();
            $table->unsignedSmallInteger('chaqueta_femenino_cantidad')->nullable();
            $table->string('tenis_masculino_talla', 20)->nullable();
            $table->unsignedSmallInteger('tenis_masculino_cantidad')->nullable();
            $table->string('tenis_femenino_talla', 20)->nullable();
            $table->unsignedSmallInteger('tenis_femenino_cantidad')->nullable();
            $table->string('estado_acta', 40)->nullable();
            $table->boolean('inventario_descontado')->default(false);
            $table->string('actas_sept', 40)->nullable();
            $table->date('fecha_segunda_renovacion_2025')->nullable();
            $table->date('fecha_primera_renovacion_2024')->nullable();
            $table->date('fecha_segunda_renovacion_2024')->nullable();
            $table->date('fecha_tercera_renovacion_2024')->nullable();
            $table->date('fecha_primera_renovacion_2025')->nullable();
            $table->string('pedido_inicial', 50)->nullable();
            $table->date('fecha_inicial')->nullable();
            $table->string('pedido_renovacion_1', 50)->nullable();
            $table->string('fecha_renovacion_1', 80)->nullable();
            $table->string('pedido_renovacion_2', 50)->nullable();
            $table->string('fecha_renovacion_2', 80)->nullable();
            $table->string('pedido_renovacion_3', 50)->nullable();
            $table->string('fecha_renovacion_3', 80)->nullable();
            $table->string('pedido_renovacion_4', 50)->nullable();
            $table->string('fecha_renovacion_4', 80)->nullable();
            $table->string('pedido_renovacion_5', 50)->nullable();
            $table->string('fecha_renovacion_5', 80)->nullable();
        });
    }
};
