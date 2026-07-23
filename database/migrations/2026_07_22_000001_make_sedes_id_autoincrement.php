<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE sedes MODIFY id BIGINT UNSIGNED AUTO_INCREMENT');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE sedes MODIFY id BIGINT UNSIGNED NOT NULL');
    }
};
