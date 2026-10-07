<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $prefix = DB::getTablePrefix();
        DB::statement("ALTER TABLE `{$prefix}sedes` MODIFY id BIGINT UNSIGNED AUTO_INCREMENT");
    }

    public function down(): void
    {
        $prefix = DB::getTablePrefix();
        DB::statement("ALTER TABLE `{$prefix}sedes` MODIFY id BIGINT UNSIGNED NOT NULL");
    }
};
