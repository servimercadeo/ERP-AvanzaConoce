<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BaseIngresosSeeder extends Seeder
{
    public function run(): void
    {
        $candidateId = fn (string $identificacion) => DB::table('candidatos')->where('identificacion', $identificacion)->value('id');
        $now = now();

        Schema::disableForeignKeyConstraints();
        DB::table('base_ingresos')->truncate();
        Schema::enableForeignKeyConstraints();

        $candidatosAprobados = \App\Models\Candidato::with(['requisicion.empresa', 'requisicion.empleador', 'requisicion.cargo', 'requisicion.proyecto'])
            ->whereIn('identificacion', ['1089383135', '1089381135', '1109876654', '1002456731'])
            ->get();

        $ingresos = [];
        $addDays = 5;

        foreach ($candidatosAprobados as $c) {
            $req = $c->requisicion;

            $ingresos[] = [
                'candidato_id'               => $c->id,
                'fecha_aval'                 => $c->fecha_aval,
                'documento_identificacion'   => $c->identificacion,
                'nombre_completo'            => $c->nombres,
                'cargo'                      => $req ? ($req->cargo ? $req->cargo->nombre : null) : null,
                'ciudad'                     => 'Pereira',
                'empresa'                    => $req ? ($req->empresa ? $req->empresa->nombre : null) : null,
                'proyecto'                   => $req ? ($req->proyecto ? $req->proyecto->nombre : null) : null,
                'telefono'                   => $c->celular,
                'correo'                     => $c->correo,
                'tipo_vinculacion'           => $c->tipo_vinculacion ?? 'Directa',
                'lugar_trabajo'              => 'Centro',
                'lider_inmediato'            => $req ? $req->responsable : 'Líder',
                'empleador'                  => $req ? ($req->empleador ? $req->empleador->nombre : null) : null,
                'fecha_programacion_ingreso' => $now->copy()->addDays($addDays)->toDateString(),
                'fecha_correccion'           => null,
                'tasa_riesgo_arl'            => 'Clase I',
                'salario_basico'             => 3500000,
                'auxilio_transporte'         => 162000,
                'otrosi_variable'            => 0,
                'auxilio_rodamiento'         => 0,
                'auxilio_comunicacion'       => 50000,
                'auxilio_alimentacion'       => 0,
                'estado'                     => 'activa',
                'created_at'                 => $now,
                'updated_at'                 => $now,
            ];
            $addDays += 2;
        }

        DB::table('base_ingresos')->insert($ingresos);
    }
}
