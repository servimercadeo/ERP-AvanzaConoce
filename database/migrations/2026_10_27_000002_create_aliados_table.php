<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Aliados (subagentes) de Work Orders. Dos tipos:
     * - empresa: solo se crea el aliado (NIT o CC: también hay personas naturales con
     *   técnicos a cargo); sus técnicos se agregan después desde su ficha.
     * - tecnico: técnico indirecto que es su propio aliado; al crearlo se crea también su
     *   usuario técnico con los mismos datos.
     * Los técnicos son usuarios del ERP con rol `tecnico` y `aliado_id`. La cédula sigue
     * siendo única en `users`; el documento del aliado vive aquí, así que nunca choca.
     */
    public function up(): void
    {
        if (!Schema::hasTable('aliados')) {
            Schema::create('aliados', function (Blueprint $table) {
                $table->id();
                $table->string('tipo', 20);
                $table->string('tipo_documento', 10);
                $table->string('documento', 20)->unique();
                $table->string('nombre', 150);
                $table->string('contacto_nombre', 150)->nullable();
                $table->string('telefono', 20)->nullable();
                $table->string('correo', 150)->nullable();
                $table->string('ciudad', 100)->nullable();
                $table->string('direccion', 255)->nullable();
                $table->text('observaciones')->nullable();
                $table->boolean('activo')->default(true);
                $table->timestamps();

                $table->index('tipo');
            });
        }

        if (!Schema::hasColumn('users', 'aliado_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('aliado_id')->nullable()->after('rol')->constrained('aliados')->nullOnDelete();
            });
        }

        // El técnico ve sus Work Orders, pero no administra aliados.
        $existe = DB::table('permisos_denegados')
            ->where(['rol' => 'tecnico', 'modulo_id' => 'inventarios', 'submodulo_id' => 'aliados'])
            ->exists();
        if (!$existe) {
            DB::table('permisos_denegados')->insert([
                'rol' => 'tecnico', 'modulo_id' => 'inventarios', 'submodulo_id' => 'aliados',
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('permisos_denegados')
            ->where(['rol' => 'tecnico', 'modulo_id' => 'inventarios', 'submodulo_id' => 'aliados'])
            ->delete();

        if (Schema::hasColumn('users', 'aliado_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropConstrainedForeignId('aliado_id');
            });
        }

        Schema::dropIfExists('aliados');
    }
};
