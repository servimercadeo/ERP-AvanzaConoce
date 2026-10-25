<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cargos que se ofrecen en "Cargo requerido" de una requisición. El catálogo `cargos`
     * completo lo siguen usando Contratos/Empleados, por eso solo se marca este subconjunto.
     */
    private const CARGOS_REQUISICION = [
        'ALMACENISTA',
        'ANALISTA DE OPERACIONES',
        'ANALISTA DE PROCESOS COMERCIALES',
        'ANALISTA OPERATIVO',
        'ASESOR COMERCIAL',
        'AUXILIAR CHURN',
        'AUXILIAR DE ALMACEN',
        'AUXILIAR DE COMPRAS',
        'AUXILIAR DE NOMINA',
        'AUXILIAR DE OPERACIONES',
        'AUXILIAR DE SERVICIOS GENERALES',
        'AUXILIAR DE SISTEMAS',
        'AUXILIAR FINANCIERO',
        'AUXILIAR SST',
        'AUXILIAR TALENTO HUMANO',
        'BACKOFFICE',
        'CONSULTOR CAC',
        'CONTADOR',
        'COORDINADOR COMERCIAL ANTIOQUIA',
        'COORDINADOR COMERCIAL COSTA',
        'COORDINADOR COMERCIAL VALLE',
        'COORDINADOR DE FORMACION',
        'COORDINADOR DE NOMINA',
        'COORDINADOR NACIONAL DE INVENTARIOS',
        'COORDINADOR OPERATIVO',
        'COORDINADOR REGIONAL DE ALMACÉN',
        'COORDINADOR SST',
        'COORDINADOR TALENTO HUMANO',
        'COORDINADORA DE SELECCION Y RECLUTAMIENTO',
        'DIRECTOR COMERCIAL',
        'GERENTE ADMINISTRATIVA Y FINANCIERA',
        'GERENTE DE TALENTO HUMANO',
        'GERENTE TIC',
        'GESTOR CHURN',
        'GESTOR DE ZONA',
        'JEFE DE NEGOCIOS HUGHES',
        'JEFE DE PLANEACION',
        'JEFE NACIONAL DE OPERACIONES',
        'JEFE REGIONAL DE VENTAS',
        'LIDER DE COMPRAS',
        'LIDER DE GESTION',
        'LIDER OPERATIVO DE NEGOCIO',
        'LIDER REGIONAL',
        'SUPERVISOR COMERCIAL',
        'SUPERVISOR COMERCIAL ALIADOS',
        'SUPERVISOR TECNICO',
        'TECNICO AUXILIAR EN CAMPO',
        'TÉCNICO DE INSTALACIONES',
        'TESORERA',
        'TORRE DE CONTROL',
    ];

    public function up(): void
    {
        Schema::table('cargos', function (Blueprint $table) {
            $table->boolean('en_requisicion')->default(false)->after('nombre');
        });

        $existentes = DB::table('cargos')->get(['id', 'nombre'])
            ->keyBy(fn ($c) => $this->comparable($c->nombre));
        $siguienteId = (int) DB::table('cargos')->max('id');
        $now = now();

        foreach (self::CARGOS_REQUISICION as $nombre) {
            $cargo = $existentes->get($this->comparable($nombre));
            if ($cargo) {
                DB::table('cargos')->where('id', $cargo->id)->update(['en_requisicion' => true]);
                continue;
            }
            DB::table('cargos')->insert([
                'id'             => ++$siguienteId,
                'nombre'         => $nombre,
                'en_requisicion' => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('cargos', function (Blueprint $table) {
            $table->dropColumn('en_requisicion');
        });
    }

    private function comparable(string $s): string
    {
        $s = mb_strtoupper(trim($s), 'UTF-8');
        $s = strtr($s, ['Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U', 'Ü' => 'U']);
        return preg_replace('/\s+/', ' ', $s);
    }
};
