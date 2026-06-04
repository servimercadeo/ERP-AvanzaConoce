<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('requisiciones')
            ->whereNull('registro_token')
            ->get(['id'])
            ->each(function ($row) {
                DB::table('requisiciones')
                    ->where('id', $row->id)
                    ->update(['registro_token' => Str::uuid()->toString()]);
            });
    }

    public function down(): void {}
};
