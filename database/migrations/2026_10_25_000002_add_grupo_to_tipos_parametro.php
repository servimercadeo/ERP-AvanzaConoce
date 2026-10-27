<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tipos de Parámetro que comparten "grupo" se agrupan en un solo submódulo del menú
     * de Parametros (una pestaña por tipo), en vez de cada uno tener su propio submódulo
     * suelto. Ej.: Tipo de Servicio + Tipo de Cliente + Proveedor/Código Instalador, todos
     * con grupo "Work Orders", aparecen juntos bajo "Work Orders" en el menú.
     */
    public function up(): void
    {
        if (Schema::hasColumn('tipos_parametro', 'grupo')) {
            return;
        }

        Schema::table('tipos_parametro', function (Blueprint $table) {
            $table->string('grupo', 100)->nullable()->after('nombre');
        });
    }

    public function down(): void
    {
        Schema::table('tipos_parametro', function (Blueprint $table) {
            $table->dropColumn('grupo');
        });
    }
};
