<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('requisiciones', function (Blueprint $table) {
            $table->uuid('registro_token')->nullable()->unique()->after('nro_identificacion_proceso');
        });

        DB::table('requisiciones')->get()->each(function ($r) {
            DB::table('requisiciones')->where('id', $r->id)->update([
                'registro_token' => Str::uuid()->toString(),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('requisiciones', function (Blueprint $table) {
            $table->dropUnique(['registro_token']);
            $table->dropColumn('registro_token');
        });
    }
};
