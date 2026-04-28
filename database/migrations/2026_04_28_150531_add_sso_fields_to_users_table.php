<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Vínculo con el ID del usuario en AvanzaConoce
            $table->unsignedBigInteger('avanzaconoce_id')->nullable()->unique()->after('id');

            // Rol dentro del ERP
            $table->enum('rol', ['admin', 'gestor', 'consultor'])->default('consultor')->after('email_verified_at');

            // Estado de la cuenta
            $table->boolean('activo')->default(true)->after('rol');

            // Última vez que se autenticó vía SSO
            $table->timestamp('ultimo_sso_at')->nullable()->after('activo');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['avanzaconoce_id', 'rol', 'activo', 'ultimo_sso_at']);
        });
    }
};
