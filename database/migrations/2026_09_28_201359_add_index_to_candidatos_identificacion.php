<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasIndex('candidatos', ['identificacion'])) {
            return;
        }

        Schema::table('candidatos', function (Blueprint $table) {
            $table->index('identificacion');
        });
    }

    public function down(): void
    {
        Schema::table('candidatos', function (Blueprint $table) {
            $table->dropIndex(['identificacion']);
        });
    }
};
