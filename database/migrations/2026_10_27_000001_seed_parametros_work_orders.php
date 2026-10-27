<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Catálogos de Parametros > Work Orders. Se habían cargado solo en la base de datos
     * local (por tinker, no por migración), por eso al desplegar el código no aparecían
     * para nadie más: el submódulo "Work Orders" del menú se arma dinámicamente a partir
     * de estos registros (ver resources/js/hooks/useErpModules.js), así que sin ellos en la
     * base de datos de producción el menú simplemente no tiene nada que mostrar.
     */
    private const TIPOS = [
        'Tipo de Servicio' => [
            'S06' => 'Pendiente', 'S03' => 'Pendiente', 'MB02' => 'Pendiente', 'MA01' => 'Pendiente',
            'IA05' => 'Pendiente', 'S21' => 'Pendiente', 'PC02' => 'Pendiente', 'S02' => 'Pendiente',
            'MB01' => 'Pendiente', 'S99' => 'Pendiente', 'PC03' => 'Pendiente', 'IL01' => 'Pendiente',
            'S10' => 'Pendiente', 'PC09' => 'Pendiente', 'IA06' => 'Pendiente', 'PC04' => 'Pendiente',
            'PC01' => 'Pendiente', 'IC09' => 'Pendiente', 'S26' => 'Pendiente', 'S01' => 'Pendiente',
            'IB01' => 'Pendiente', 'IA01' => 'Pendiente', 'AU01' => 'Pendiente', 'IA02' => 'Pendiente',
            'IB02' => 'Pendiente',
        ],
        'Tipo de Cliente' => [
            'Pospago' => '', 'Comercial' => '', 'Distribuidor' => '', 'Empleado' => '', 'Prepago' => '',
        ],
        'Proveedor / Código Instalador' => [
            'CO-I004271-SERVIMERCADEO' => 'BARRANQUILLA',
            'CO-I004283-SERVIMERCADEO' => 'CALI',
            'CO-I004219-SERVIMERCADEO' => 'MANIZALES',
            'CO-I004746-SERVIMERCADEO' => 'TUMACO',
            'CO-I004174-SERVIMERCADEO' => 'PEREIRA',
            'CO-I004212-SERVIMERCADEO' => 'RIONEGRO',
            'CO-I005135-SERVIMERCADEO' => 'TULUA',
            'CO-I004213-SERVIMERCADEO' => 'MEDELLIN',
            'CO-I005075-SERVIMERCADEO' => 'BUENAVENTURA',
            'CO-I004332-SERVIMERCADEO' => 'PASTO',
            'CO-I004412-SERVIMERCADEO' => 'MONTERIA',
            'CO-I005299-SERVIMERCADEO' => 'VALLE OCCIDENTE',
            'CO-I005115-SERVIMERCADEO' => 'SINCELEJO',
        ],
        'Perímetro de la Zona' => [
            'URBANO' => '', 'RURAL' => '', 'EXTRARURAL' => '', 'Aereo/Fluvial' => '',
        ],
        'Tecnología' => [
            'IRD DVR' => '', 'IRD' => '', 'IRD DVR HD' => '', 'IRD HD ONLY' => '',
            'Modem' => '', 'MODEM FTTH' => '', 'IRD DVR HD 4K' => '', 'IRD PREPAGO HD' => '',
        ],
    ];

    public function up(): void
    {
        $now = now();

        foreach (self::TIPOS as $nombreTipo => $valores) {
            $tipoId = DB::table('tipos_parametro')->where('nombre', $nombreTipo)->value('id');

            if ($tipoId) {
                DB::table('tipos_parametro')->where('id', $tipoId)->update(['grupo' => 'Work Orders', 'updated_at' => $now]);
            } else {
                $tipoId = DB::table('tipos_parametro')->insertGetId([
                    'nombre'     => $nombreTipo,
                    'grupo'      => 'Work Orders',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            foreach ($valores as $nombreValor => $descripcion) {
                // La comparación la hace MySQL (sin distinguir mayúsculas ni tildes, igual que
                // el índice único tipo+nombre): si producción ya tiene "Urbano", no se inserta
                // "URBANO", que fallaría como duplicado y trabaría `migrate`.
                $existe = DB::table('valores_parametro')
                    ->where('tipo_parametro_id', $tipoId)
                    ->where('nombre', $nombreValor)
                    ->exists();
                if ($existe) {
                    continue;
                }
                DB::table('valores_parametro')->insert([
                    'tipo_parametro_id' => $tipoId,
                    'nombre'            => $nombreValor,
                    'descripcion'       => $descripcion ?: null,
                    'created_at'        => $now,
                    'updated_at'        => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        $ids = DB::table('tipos_parametro')->whereIn('nombre', array_keys(self::TIPOS))->pluck('id');
        DB::table('valores_parametro')->whereIn('tipo_parametro_id', $ids)->delete();
        DB::table('tipos_parametro')->whereIn('id', $ids)->delete();
    }
};
