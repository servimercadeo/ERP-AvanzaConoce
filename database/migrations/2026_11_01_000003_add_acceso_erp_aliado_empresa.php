<?php

use App\Models\Aliado;
use App\Services\UsuarioAliadoEmpresa;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Los aliados EMPRESA entran al ERP (antes solo tenían usuario en AvanzaConoce): rol
     * nuevo `aliado` y `aliados.usuario_id`, su usuario. Ver App\Services\UsuarioAliadoEmpresa.
     * A los aliados empresa ya creados se les crea su usuario aquí, con la contraseña que ya
     * tienen en AvanzaConoce. El rol no entra en la matriz de Permisos: su acceso es fijo.
     */
    public function up(): void
    {
        $prefix = DB::getTablePrefix();
        DB::statement("ALTER TABLE `{$prefix}users` MODIFY rol ENUM('admin', 'th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general', 'tecnico', 'aliado') NULL DEFAULT 'general'");

        if (!Schema::hasColumn('aliados', 'usuario_id')) {
            Schema::table('aliados', function (Blueprint $table) {
                $table->foreignId('usuario_id')->nullable()->after('activo')->constrained('users')->nullOnDelete();
            });
        }

        $servicio = app(UsuarioAliadoEmpresa::class);
        Aliado::where('tipo', Aliado::EMPRESA)->whereNull('usuario_id')->orderBy('id')->each(function (Aliado $aliado) use ($servicio) {
            try {
                $servicio->asegurar($aliado);
            } catch (\Throwable $e) {
                // Un aliado con datos raros no detiene el despliegue: se corrige editándolo.
                Log::warning("No se creó el usuario del ERP del aliado {$aliado->documento}: {$e->getMessage()}");
            }
        });
    }

    public function down(): void
    {
        $ids = DB::table('aliados')->whereNotNull('usuario_id')->pluck('usuario_id');
        if (Schema::hasColumn('aliados', 'usuario_id')) {
            Schema::table('aliados', function (Blueprint $table) {
                $table->dropConstrainedForeignId('usuario_id');
            });
        }
        DB::table('users')->whereIn('id', $ids)->where('rol', 'aliado')->delete();
        DB::table('users')->where('rol', 'aliado')->update(['rol' => null]);

        $prefix = DB::getTablePrefix();
        DB::statement("ALTER TABLE `{$prefix}users` MODIFY rol ENUM('admin', 'th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general', 'tecnico') NULL DEFAULT 'general'");
    }
};
