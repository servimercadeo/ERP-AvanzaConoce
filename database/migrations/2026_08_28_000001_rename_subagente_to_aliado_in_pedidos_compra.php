<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Paso intermedio: el enum debe aceptar ambos valores antes de poder
        // reescribir las filas existentes de 'Subagente' a 'Aliado' (MySQL valida
        // el valor contra la definición ACTUAL de la columna en cada UPDATE).
        DB::statement("ALTER TABLE pedidos_compra MODIFY tipo_responsable ENUM('Empleado','Subagente','Aliado') NOT NULL");
        DB::table('pedidos_compra')->where('tipo_responsable', 'Subagente')->update(['tipo_responsable' => 'Aliado']);
        DB::statement("ALTER TABLE pedidos_compra MODIFY tipo_responsable ENUM('Empleado','Aliado') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE pedidos_compra MODIFY tipo_responsable ENUM('Empleado','Subagente','Aliado') NOT NULL");
        DB::table('pedidos_compra')->where('tipo_responsable', 'Aliado')->update(['tipo_responsable' => 'Subagente']);
        DB::statement("ALTER TABLE pedidos_compra MODIFY tipo_responsable ENUM('Empleado','Subagente') NOT NULL");
    }
};
