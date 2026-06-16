<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('dotaciones', 'pedidos_automaticos');
    }

    public function down(): void
    {
        Schema::rename('pedidos_automaticos', 'dotaciones');
    }
};
