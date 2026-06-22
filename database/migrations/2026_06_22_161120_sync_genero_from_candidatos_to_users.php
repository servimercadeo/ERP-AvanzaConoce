<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Para usuarios cuyo genero no es un valor reconocido,
        // sincronizamos desde candidatos usando cedula/identificacion.
        $users = DB::table('users')
            ->whereNotNull('cedula')
            ->where('cedula', '!=', '')
            ->whereNotIn('genero', ['Masculino', 'Femenino', 'Otro', 'No binario', 'Prefiero no decir'])
            ->select('id', 'cedula')
            ->get();

        foreach ($users as $user) {
            $genero = DB::table('candidatos')
                ->where('identificacion', $user->cedula)
                ->value('genero');

            if ($genero) {
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['genero' => $genero]);
            }
        }
    }

    public function down(): void
    {
        // No reversible
    }
};
