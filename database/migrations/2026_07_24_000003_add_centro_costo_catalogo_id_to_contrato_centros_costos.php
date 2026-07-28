<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sin este id, al reabrir un contrato ya guardado no hay forma confiable de saber cuál fila
     * del catálogo estaba seleccionada (codigo solo no es único, ver 2026_07_24_000002). Backfill
     * best-effort para filas existentes: solo cuando codigo+nombre resuelven a una única fila del
     * catálogo; si no, queda null y hay que reasignar el centro de costo desde la vista.
     */
    public function up(): void
    {
        Schema::table('contrato_centros_costos', function (Blueprint $table) {
            $table->foreignId('centro_costo_catalogo_id')->nullable()->after('contrato_id')
                ->constrained('centros_costo_catalogo')->nullOnDelete();
        });

        DB::table('contrato_centros_costos')->orderBy('id')->each(function ($fila) {
            $match = DB::table('centros_costo_catalogo')
                ->where('codigo', $fila->codigo)
                ->where('nombre', $fila->centro_costos)
                ->pluck('id');

            if ($match->count() === 1) {
                DB::table('contrato_centros_costos')->where('id', $fila->id)
                    ->update(['centro_costo_catalogo_id' => $match->first()]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('contrato_centros_costos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('centro_costo_catalogo_id');
        });
    }
};
