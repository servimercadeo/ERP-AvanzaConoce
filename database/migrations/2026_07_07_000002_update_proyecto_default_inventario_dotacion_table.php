<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE inventario_dotacion ALTER COLUMN proyecto SET DEFAULT 'SYM ADMINISTRATIVO'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE inventario_dotacion ALTER COLUMN proyecto SET DEFAULT 'TIGO EXPRESS'");
    }
};
