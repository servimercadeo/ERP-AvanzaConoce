<?php

namespace Tests\Feature\Seleccion;

use App\Mail\AlertaIngresoMail;
use App\Mail\CargaDocumentosMail;
use App\Mail\DocumentosCompletadosMail;
use App\Models\BaseIngreso;
use App\Models\Requisicion;
use App\Services\EmpresaDelProceso;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Los formularios y correos del proceso de selección nombran a la empresa de la
 * requisición: Servimercadeo o S&M (por defecto).
 */
class EmpresaDelProcesoTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private function empresaId(string $nombre): int
    {
        return (int) (DB::table('empresas')->where('nombre', $nombre)->value('id')
            ?? DB::table('empresas')->insertGetId(['nombre' => $nombre, 'created_at' => now(), 'updated_at' => now()]));
    }

    private function requisicionDe(string $empresa): Requisicion
    {
        return Requisicion::create([
            'nro_identificacion_proceso' => $this->unico('PROC'), 'nro_identificacion' => $this->unico('REQ'),
            'fecha_solicitud' => '2026-10-01', 'requeridas' => 1, 'estado' => 'Abierta',
            'empresa_id' => $this->empresaId($empresa),
        ]);
    }

    private function token(string $cedula): string
    {
        return urlencode(Crypt::encryptString($cedula));
    }

    public function test_reconoce_la_empresa_por_su_nombre(): void
    {
        $this->assertSame('servimercadeo', EmpresaDelProceso::deNombre('Servimercadeo COL')['clave']);
        $this->assertSame('servimercadeo', EmpresaDelProceso::deNombre(' SERVIMERCADEO ')['clave']);
        $this->assertSame('sym', EmpresaDelProceso::deNombre('Servicios y Mercadeo COL')['clave']);
        $this->assertSame('sym', EmpresaDelProceso::deNombre(null)['clave']);
    }

    public function test_el_registro_de_candidatos_muestra_la_empresa_de_la_requisicion(): void
    {
        $servi = $this->requisicionDe('Servimercadeo COL');
        $sym = $this->requisicionDe('Servicios y Mercadeo COL');

        $this->getJson('/api/registro/catalogos?token=' . $servi->registro_token)->assertOk()
            ->assertJsonPath('empresa.nombre', 'Servimercadeo S.A.S.');
        $this->getJson('/api/registro/catalogos?token=' . $sym->registro_token)->assertOk()
            ->assertJsonPath('empresa.nombre', 'S&M Servicios y Mercadeo S.A.S.');
        $this->getJson('/api/registro/catalogos')->assertOk()
            ->assertJsonPath('empresa.clave', 'sym');
    }

    public function test_nuevos_ingresos_y_carga_de_documentos_usan_la_empresa_del_aval(): void
    {
        BaseIngreso::create(['documento_identificacion' => '7001', 'nombre_completo' => 'ANA RUIZ', 'empresa' => 'Servimercadeo COL']);

        $this->getJson('/api/registro-nuevos-ingresos/prefill?token=' . $this->token('7001'))->assertOk()
            ->assertJsonPath('empresa.clave', 'servimercadeo');
        $this->getJson('/api/carga-documentos/resolve-token?token=' . $this->token('7001'))->assertOk()
            ->assertJsonPath('empresa.clave', 'servimercadeo');
    }

    public function test_sin_empresa_en_el_aval_usa_la_de_la_requisicion_del_candidato(): void
    {
        $req = $this->requisicionDe('Servimercadeo COL');
        DB::table('candidatos')->insert(['nombres' => 'LUIS PAZ', 'identificacion' => '7002', 'correo' => 'luis@test.co', 'fecha_postulacion' => '2026-10-01', 'requisicion_id' => $req->id, 'created_at' => now(), 'updated_at' => now()]);
        BaseIngreso::create(['documento_identificacion' => '7002', 'nombre_completo' => 'LUIS PAZ']);

        $this->assertSame('servimercadeo', EmpresaDelProceso::deCedula('7002')['clave']);
        $this->assertSame('sym', EmpresaDelProceso::deCedula('9999')['clave']);
    }

    public function test_los_correos_nombran_a_la_empresa_de_la_requisicion(): void
    {
        $ingreso = BaseIngreso::create([
            'documento_identificacion' => '7003', 'nombre_completo' => 'EVA SOL', 'correo' => 'eva@test.co', 'empresa' => 'Servimercadeo COL',
        ]);

        foreach ([
            new AlertaIngresoMail($ingreso),
            new CargaDocumentosMail('Eva Sol', '7003'),
            new DocumentosCompletadosMail('Eva', '7003'),
        ] as $mail) {
            $html = $mail->render();
            $this->assertStringContainsString('Servimercadeo S.A.S.', $html, get_class($mail));
            $this->assertStringNotContainsString('Servicios y Mercadeo', $html, get_class($mail));
        }

        $this->assertStringContainsString('S&amp;M Servicios y Mercadeo S.A.S.', (new CargaDocumentosMail('Otro', '9999'))->render());
    }
}
