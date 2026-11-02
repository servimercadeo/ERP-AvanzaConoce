<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('sedes')
            ->where('nombre', 'SERVIMERCADEO VALLE OCCIDENTE')
            ->whereNull('id_ciudad')
            ->update(['id_ciudad' => DB::table('ciudades')->where('nombre', 'Buenaventura')->value('id'), 'updated_at' => now()]);

        $pereira = DB::table('sedes')->where('nombre', 'SERVIMERCADEO PEREIRA')->value('id');
        if ($pereira) {
            DB::table('proveedores_work_orders')->updateOrInsert(
                ['codigo' => 'CO-I005115'],
                ['sede_id' => $pereira, 'nombre' => 'CO-I005115-SERVIMERCADEO', 'created_at' => now(), 'updated_at' => now()],
            );
        }
    }

    public function down(): void
    {
        // La ciudad se queda: el formulario de Sedes la exige.
        DB::table('proveedores_work_orders')->where('codigo', 'CO-I005115')->delete();
    }
};
