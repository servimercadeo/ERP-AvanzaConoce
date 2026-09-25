<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Los roles "gestor" y "consultor" quedan reemplazados por 4 roles reales por área:
 * Operaciones, Financiera, Supervisores y General (junto con los ya existentes Th y
 * TIC). Ningún usuario tenía "gestor"; los que tenían "consultor" pasan a "general"
 * (el admin los reasigna manualmente al rol correcto después). Las reglas de
 * permisos_denegados de gestor/consultor se fusionan hacia "general" sin duplicar.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Primero se amplía el enum (superset de lo viejo y lo nuevo) para poder migrar
        // los datos existentes sin que MySQL trunque 'general' por no reconocerlo todavía.
        DB::statement("ALTER TABLE users MODIFY rol ENUM('admin', 'gestor', 'consultor', 'th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general') NULL DEFAULT 'general'");

        DB::table('users')->whereIn('rol', ['gestor', 'consultor'])->update(['rol' => 'general']);

        DB::statement("ALTER TABLE users MODIFY rol ENUM('admin', 'th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general') NULL DEFAULT 'general'");

        // `permisos_denegados.rol` es igualmente un ENUM propio en la base de datos
        // (no solo una validación de la app vía ROLES_GESTIONABLES) — mismo baile de
        // ampliar-migrar-angostar que en `users.rol`.
        DB::statement("ALTER TABLE permisos_denegados MODIFY rol ENUM('gestor', 'consultor', 'th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general') NOT NULL");

        $heredadas = DB::table('permisos_denegados')->whereIn('rol', ['gestor', 'consultor'])->get();
        foreach ($heredadas as $fila) {
            DB::table('permisos_denegados')->updateOrInsert(
                ['rol' => 'general', 'modulo_id' => $fila->modulo_id, 'submodulo_id' => $fila->submodulo_id],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }
        DB::table('permisos_denegados')->whereIn('rol', ['gestor', 'consultor'])->delete();

        DB::statement("ALTER TABLE permisos_denegados MODIFY rol ENUM('th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general') NOT NULL");

        // Los roles nuevos sin historial previo (nunca existieron como 'gestor'/'consultor')
        // no heredan nada del paso anterior: se les niega "Permisos" igual que ya se le
        // negaba a todos los demás roles no-admin desde 2026_09_10_000003.
        foreach (['operaciones', 'financiera', 'supervisores'] as $rol) {
            DB::table('permisos_denegados')->updateOrInsert(
                ['rol' => $rol, 'modulo_id' => 'permisos', 'submodulo_id' => 'roles_permisos'],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY rol ENUM('admin', 'gestor', 'consultor', 'th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general') NULL DEFAULT 'consultor'");
        DB::table('users')
            ->whereIn('rol', ['operaciones', 'financiera', 'supervisores', 'general'])
            ->update(['rol' => 'consultor']);
        DB::statement("ALTER TABLE users MODIFY rol ENUM('admin', 'gestor', 'consultor', 'th', 'tic') NULL DEFAULT 'consultor'");

        DB::statement("ALTER TABLE permisos_denegados MODIFY rol ENUM('gestor', 'consultor', 'th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general') NOT NULL");
        DB::table('permisos_denegados')
            ->whereIn('rol', ['operaciones', 'financiera', 'supervisores', 'general'])
            ->update(['rol' => 'consultor']);
        DB::statement("ALTER TABLE permisos_denegados MODIFY rol ENUM('gestor', 'consultor', 'th', 'tic') NOT NULL");
    }
};
