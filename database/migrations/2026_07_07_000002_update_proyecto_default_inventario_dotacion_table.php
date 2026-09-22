<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $prefix = DB::getTablePrefix();
        DB::statement("ALTER TABLE `{$prefix}inventario_dotacion` ALTER COLUMN proyecto SET DEFAULT 'SYM ADMINISTRATIVO'");
    }

    public function down(): void
    {
        $prefix = DB::getTablePrefix();
        DB::statement("ALTER TABLE `{$prefix}inventario_dotacion` ALTER COLUMN proyecto SET DEFAULT 'TIGO EXPRESS'");
    }
};
