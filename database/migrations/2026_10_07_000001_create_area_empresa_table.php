<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo de "Área Empresa" del contrato (en producción queda como `erp_area_empresa`
 * por el prefijo). `contratos.area_empresa` sigue guardando el nombre como texto, así
 * que los contratos existentes no cambian.
 *
 * Idempotente: en producción la tabla puede existir ya creada a mano.
 */
return new class extends Migration
{
    private const AREAS = ['ADMINISTRATIVO', 'COMERCIAL', 'OPERACIONES'];

    public function up(): void
    {
        if (!Schema::hasTable('area_empresa')) {
            Schema::create('area_empresa', function (Blueprint $table) {
                $table->id();
                $table->string('nombre', 100)->unique();
                $table->timestamps();
            });
        }

        $existentes = DB::table('area_empresa')->pluck('nombre')
            ->map(fn ($n) => mb_strtoupper(trim($n), 'UTF-8'))->all();

        foreach (self::AREAS as $nombre) {
            if (!in_array($nombre, $existentes, true)) {
                DB::table('area_empresa')->insert([
                    'nombre'     => $nombre,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('area_empresa');
    }
};
