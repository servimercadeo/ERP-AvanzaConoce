<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sedes', function (Blueprint $table) {
            $table->foreignId('regional_id')->nullable()->after('id_ciudad')->constrained('regionales')->nullOnDelete();
            $table->string('supervisor', 150)->nullable()->after('sub_canal');
            $table->string('contacto_supervisor', 50)->nullable()->after('supervisor');
            $table->string('lider_regional', 150)->nullable()->after('contacto_supervisor');
            $table->string('contacto_lider_regional', 50)->nullable()->after('lider_regional');
        });
    }

    public function down(): void
    {
        Schema::table('sedes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('regional_id');
            $table->dropColumn(['supervisor', 'contacto_supervisor', 'lider_regional', 'contacto_lider_regional']);
        });
    }
};
