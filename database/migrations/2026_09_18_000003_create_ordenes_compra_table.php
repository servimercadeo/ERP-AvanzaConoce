<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * La Orden de Compra formaliza, hacia UN proveedor, un grupo de productos que ya
 * quedaron "Enviado a Compras" en la revisión de stock de Pedidos (ver
 * RevisionStockPedidoCompraController::enviarACompras()) — antes de esto no existía
 * ningún documento propio para eso, los items solo se quedaban marcados sin más.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ordenes_compra', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->dateTime('fecha_registro');
            $table->foreignId('sede_id')->constrained('sedes');
            $table->foreignId('empresa_id')->nullable()->constrained('empresas')->nullOnDelete();
            $table->foreignId('proveedor_id')->constrained('proveedores');
            // Snapshot de proveedores.naturaleza al momento de crear la orden (mismo
            // criterio que el snapshot de nombre de producto en PedidoCompraItem): si el
            // proveedor cambia de naturaleza después, esta orden histórica no debe cambiar.
            $table->string('naturaleza', 30);
            $table->foreignId('forma_pago_id')->nullable()->constrained('formas_pago')->nullOnDelete();
            $table->date('fecha_entrega')->nullable();
            $table->text('observaciones')->nullable();
            $table->unsignedBigInteger('valor_transporte')->default(0);
            $table->unsignedBigInteger('subtotal')->default(0);
            $table->unsignedBigInteger('iva_total')->default(0);
            $table->unsignedBigInteger('valor_total')->default(0);
            $table->string('estado', 30)->default('Creada');
            $table->string('creado_por', 150)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ordenes_compra');
    }
};
