<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Regionales de cobertura de contactos que aún no existen en el catálogo `regionales`
    // (el que ya usan Contratos y Pedidos). COSTA, EJE CAFETERO y ORIENTE ya existen y se
    // reutilizan tal cual.
    private const REGIONALES_NUEVAS = [
        'ANTIOQUIA',
        'BOGOTÁ Y CUNDINAMARCA',
        'OCCIDENTE',
        'TODO A NIVEL NACIONAL',
    ];

    public function up(): void
    {
        $now = now();
        foreach (self::REGIONALES_NUEVAS as $nombre) {
            DB::table('regionales')->insertOrIgnore([
                'nombre'     => $nombre,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        Schema::table('empleador_contactos', function (Blueprint $table) {
            $table->foreignId('regional_id')->nullable()->after('correo')->constrained('regionales')->nullOnDelete();
        });

        // Enlazar cada contacto existente (regional en texto libre) con su fila real en
        // `regionales`, por nombre (mayúsculas/trim, ya normalizado en el paso anterior).
        DB::table('empleador_contactos')->get(['id', 'regional'])->each(function ($c) {
            $regionalId = DB::table('regionales')
                ->whereRaw('UPPER(nombre) = ?', [mb_strtoupper(trim($c->regional), 'UTF-8')])
                ->value('id');

            DB::table('empleador_contactos')->where('id', $c->id)->update(['regional_id' => $regionalId]);
        });

        Schema::table('empleador_contactos', function (Blueprint $table) {
            $table->dropColumn('regional');
        });
    }

    public function down(): void
    {
        Schema::table('empleador_contactos', function (Blueprint $table) {
            $table->string('regional', 100)->nullable()->after('correo');
        });

        DB::table('empleador_contactos')
            ->join('regionales', 'regionales.id', '=', 'empleador_contactos.regional_id')
            ->update(['empleador_contactos.regional' => DB::raw('regionales.nombre')]);

        Schema::table('empleador_contactos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('regional_id');
        });
    }
};
