<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Aliado empresa: nombre y número de documento de su representante legal. */
    public function up(): void
    {
        Schema::table('aliados', function (Blueprint $table) {
            if (!Schema::hasColumn('aliados', 'representante_legal_nombre')) {
                $table->string('representante_legal_nombre', 150)->nullable()->after('nombre');
            }
            if (!Schema::hasColumn('aliados', 'representante_legal_documento')) {
                $table->string('representante_legal_documento', 20)->nullable()->after('representante_legal_nombre');
            }
        });
    }

    public function down(): void
    {
        Schema::table('aliados', function (Blueprint $table) {
            foreach (['representante_legal_nombre', 'representante_legal_documento'] as $columna) {
                if (Schema::hasColumn('aliados', $columna)) {
                    $table->dropColumn($columna);
                }
            }
        });
    }
};
