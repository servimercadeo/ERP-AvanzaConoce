<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Los datos bancarios (banco, tipo y número de cuenta) pasan a ser del contrato: se editan
 * en Contratos y se copian al empleado desde allí, igual que salario, cargo o seguridad social.
 *
 * También completa los catálogos de bancos y fondos de cesantías, que en producción estaban
 * vacíos (los selectores no mostraban nada). Solo agrega los nombres que falten.
 */
return new class extends Migration
{
    private const BANCOS = [
        'BANCOLOMBIA', 'DAVIVIENDA', 'BANCO DE BOGOTA', 'BBVA', 'BANCO DE OCCIDENTE', 'BANCO POPULAR',
        'AV VILLAS', 'BANCO CAJA SOCIAL', 'BANCO AGRARIO', 'SCOTIABANK COLPATRIA', 'ITAU', 'BANCO FALABELLA',
        'BANCO PICHINCHA', 'BANCOOMEVA', 'BANCO GNB SUDAMERIS', 'BANCO FINANDINA', 'BANCO SERFINANZA',
        'BANCO W', 'BANCO MUNDO MUJER', 'NEQUI', 'DAVIPLATA', 'LULO BANK', 'NU COLOMBIA',
    ];

    private const FONDOS_CESANTIAS = ['PORVENIR', 'PROTECCION', 'COLFONDOS', 'SKANDIA', 'FONDO NACIONAL DEL AHORRO'];

    public function up(): void
    {
        if (!Schema::hasColumn('contratos', 'banco')) {
            Schema::table('contratos', function (Blueprint $table) {
                $table->string('banco', 100)->nullable()->after('fondo_cesantias');
                $table->string('tipo_cuenta', 30)->nullable()->after('banco');
                $table->string('cuenta_bancaria', 30)->nullable()->after('tipo_cuenta');
            });
        }

        // Conservar los datos bancarios que ya tenían los empleados: se copian a sus contratos.
        DB::table('contratos')
            ->join('users', 'users.id', '=', 'contratos.empleado_id')
            ->whereNull('contratos.banco')
            ->whereNull('contratos.tipo_cuenta')
            ->whereNull('contratos.cuenta_bancaria')
            ->where(fn ($q) => $q->whereNotNull('users.banco')
                ->orWhereNotNull('users.tipo_cuenta')
                ->orWhereNotNull('users.cuenta_bancaria'))
            ->update([
                'contratos.banco'           => DB::raw(DB::getTablePrefix() . 'users.banco'),
                'contratos.tipo_cuenta'     => DB::raw(DB::getTablePrefix() . 'users.tipo_cuenta'),
                'contratos.cuenta_bancaria' => DB::raw(DB::getTablePrefix() . 'users.cuenta_bancaria'),
            ]);

        // Los datos importados traen el tipo de cuenta como código (CA/CC); el selector usa el nombre.
        foreach (['contratos', 'users'] as $tabla) {
            DB::table($tabla)->whereIn('tipo_cuenta', ['CA', 'AHORROS'])->update(['tipo_cuenta' => 'Ahorros']);
            DB::table($tabla)->whereIn('tipo_cuenta', ['CC', 'CORRIENTE'])->update(['tipo_cuenta' => 'Corriente']);
        }

        $this->completarCatalogo('bancos', self::BANCOS);
        $this->completarCatalogo('fondos_cesantias', self::FONDOS_CESANTIAS);
    }

    public function down(): void
    {
        Schema::table('contratos', function (Blueprint $table) {
            $table->dropColumn(['banco', 'tipo_cuenta', 'cuenta_bancaria']);
        });
    }

    /** Agrega los nombres que falten (sin distinguir mayúsculas). Los ids no son autoincrementales. */
    private function completarCatalogo(string $tabla, array $nombres): void
    {
        $existentes = DB::table($tabla)->pluck('nombre')->map(fn ($n) => mb_strtoupper(trim($n), 'UTF-8'))->all();
        $id = (int) DB::table($tabla)->max('id');

        foreach ($nombres as $nombre) {
            if (!in_array($nombre, $existentes, true)) {
                DB::table($tabla)->insert(['id' => ++$id, 'nombre' => $nombre, 'created_at' => now(), 'updated_at' => now()]);
            }
        }
    }
};
