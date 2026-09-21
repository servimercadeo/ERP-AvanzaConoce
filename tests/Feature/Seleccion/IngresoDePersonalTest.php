<?php

namespace Tests\Feature\Seleccion;

use App\Mail\AlertaIngresoMail;
use App\Mail\CargaDocumentosMail;
use App\Mail\DocumentosCompletadosMail;
use App\Models\BaseIngreso;
use App\Models\Candidato;
use App\Models\RespuestaIngreso;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Base de ingreso -> registro público de nuevos ingresos -> carga pública de documentos ->
 * respuestas y datos consolidados para el contrato.
 */
class IngresoDePersonalTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private const DOCS_OBLIGATORIOS = [
        'documento_identidad', 'diploma_bachiller', 'certificados_estudio', 'certificados_laborales',
        'certificacion_eps', 'certificacion_pension', 'hoja_vida',
    ];

    private string $metaPath;
    private ?string $metaOriginal = null;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Storage::fake('local');
        Storage::fake('public');

        // Los endpoints de documentos guardan su índice en storage/app/documentos_contratacion.json
        // (ruta real, no el disco fake): se respalda y se restaura para no ensuciar datos reales.
        $this->metaPath = storage_path('app/documentos_contratacion.json');
        $this->metaOriginal = file_exists($this->metaPath) ? file_get_contents($this->metaPath) : null;
        file_put_contents($this->metaPath, '{}');
    }

    protected function tearDown(): void
    {
        if ($this->metaOriginal === null) {
            @unlink($this->metaPath);
        } else {
            file_put_contents($this->metaPath, $this->metaOriginal);
        }
        parent::tearDown();
    }

    private function ingreso(array $extra = []): BaseIngreso
    {
        return BaseIngreso::create(array_merge([
            'documento_identificacion' => '5551234', 'nombre_completo' => 'PEDRO PICAPIEDRA', 'correo' => 'pedro@test.co',
        ], $extra));
    }

    // ── Base de ingreso ──────────────────────────────────────────────────────

    public function test_sincronizar_trae_solo_candidatos_con_pruebas_y_aval(): void
    {
        $this->actuarComo('th');
        $listo = Candidato::create(['nombres' => 'LISTO', 'identificacion' => '111', 'correo' => 'l@test.co', 'fecha_postulacion' => now(), 'pruebas' => true, 'aval' => true]);
        $sinAval = Candidato::create(['nombres' => 'SIN AVAL', 'identificacion' => '222', 'correo' => 's@test.co', 'fecha_postulacion' => now(), 'pruebas' => true, 'aval' => false]);

        $this->postJson('/api/base-ingresos/sync')->assertOk();

        $this->assertDatabaseHas('base_ingresos', ['candidato_id' => $listo->id]);
        $this->assertDatabaseMissing('base_ingresos', ['candidato_id' => $sinAval->id]);
    }

    public function test_sincronizar_dos_veces_no_duplica_ingresos(): void
    {
        $this->actuarComo('th');
        $c = Candidato::create(['nombres' => 'LISTO', 'identificacion' => '111', 'correo' => 'l@test.co', 'fecha_postulacion' => now(), 'pruebas' => true, 'aval' => true]);

        $this->postJson('/api/base-ingresos/sync')->assertOk();
        $this->postJson('/api/base-ingresos/sync')->assertOk();

        $this->assertSame(1, BaseIngreso::where('candidato_id', $c->id)->count());
    }

    public function test_eliminar_un_ingreso_desactiva_el_aval_del_candidato_para_que_sync_no_lo_recree(): void
    {
        $this->actuarComo('th');
        $c = Candidato::create(['nombres' => 'LISTO', 'identificacion' => '111', 'correo' => 'l@test.co', 'fecha_postulacion' => now(), 'pruebas' => true, 'aval' => true]);
        $this->postJson('/api/base-ingresos/sync')->assertOk();
        $ingreso = BaseIngreso::where('candidato_id', $c->id)->first();

        $this->deleteJson("/api/base-ingresos/{$ingreso->id}")->assertNoContent();
        $this->postJson('/api/base-ingresos/sync')->assertOk();

        $this->assertFalse((bool) $c->fresh()->aval);
        $this->assertSame(0, BaseIngreso::where('candidato_id', $c->id)->count());
    }

    public function test_alerta_de_ingreso_se_envia_por_correo_y_se_marca(): void
    {
        $this->actuarComo('th');
        $ingreso = $this->ingreso();

        $this->postJson("/api/base-ingresos/{$ingreso->id}/alerta")->assertOk();

        Mail::assertSent(AlertaIngresoMail::class, fn ($m) => $m->hasTo('pedro@test.co'));
        $this->assertTrue((bool) $ingreso->fresh()->alerta_enviada);
    }

    public function test_alerta_sin_correo_falla_sin_enviar_nada(): void
    {
        $this->actuarComo('th');
        $ingreso = $this->ingreso(['correo' => null]);

        $this->postJson("/api/base-ingresos/{$ingreso->id}/alerta")->assertStatus(422);

        Mail::assertNothingSent();
        $this->assertFalse((bool) $ingreso->fresh()->alerta_enviada);
    }

    // ── Registro público de nuevos ingresos ──────────────────────────────────

    private function formulario(array $extra = []): array
    {
        return array_merge([
            'documento' => '5551234', 'nombres' => 'Pedro', 'apellidos' => 'Picapiedra', 'fecha_nacimiento' => '1990-01-01',
            'lugar_nacimiento' => 'Pereira', 'estado_civil' => 'Soltero', 'numero_hijos' => '0', 'rh' => 'O+',
            'nivel_escolaridad' => 'Bachiller', 'profesion' => 'Ninguna', 'ciudad' => 'Pereira', 'barrio' => 'Centro',
            'direccion' => 'Calle 1 # 2-3', 'estrato' => '3', 'correo' => 'pedro@test.co', 'celular' => '3001234567',
            'emergencia_nombre' => 'Wilma', 'emergencia_telefono' => '3009998877', 'emergencia_parentesco' => 'Esposa',
            'eps' => 'SURA', 'afp' => 'PORVENIR', 'talla_camisa' => 'M', 'talla_pantalon' => '32', 'talla_zapatos' => '41',
        ], $extra);
    }

    public function test_registro_de_nuevo_ingreso_es_publico_guarda_la_respuesta_y_envia_el_enlace_de_documentos(): void
    {
        $this->postJson('/api/registro-nuevos-ingresos/submit', $this->formulario())->assertCreated();

        $this->assertDatabaseHas('respuestas_ingresos', ['documento' => '5551234', 'talla_camisa' => 'M']);
        Mail::assertSent(CargaDocumentosMail::class, fn ($m) => $m->hasTo('pedro@test.co'));
    }

    public function test_reenviar_el_formulario_actualiza_la_misma_respuesta(): void
    {
        $this->postJson('/api/registro-nuevos-ingresos/submit', $this->formulario())->assertCreated();
        $this->postJson('/api/registro-nuevos-ingresos/submit', $this->formulario(['talla_camisa' => 'XL']))->assertCreated();

        $this->assertSame(1, RespuestaIngreso::where('documento', '5551234')->count());
        $this->assertSame('XL', RespuestaIngreso::where('documento', '5551234')->value('talla_camisa'));
    }

    public function test_el_formulario_valida_campos_obligatorios_y_la_fotografia(): void
    {
        $this->postJson('/api/registro-nuevos-ingresos/submit', [])->assertStatus(422)
            ->assertJsonValidationErrors(['documento', 'nombres', 'fecha_nacimiento', 'correo', 'talla_zapatos']);

        $this->postJson('/api/registro-nuevos-ingresos/submit', $this->formulario(['fotografia' => UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf')]))
            ->assertStatus(422)->assertJsonValidationErrors('fotografia');

        $this->postJson('/api/registro-nuevos-ingresos/submit', $this->formulario(['fotografia' => UploadedFile::fake()->image('foto.jpg')]))
            ->assertCreated();
        $this->assertNotNull(RespuestaIngreso::where('documento', '5551234')->value('fotografia'));
    }

    public function test_un_fallo_de_correo_no_impide_registrar_el_formulario(): void
    {
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('SMTP caído'));

        $this->postJson('/api/registro-nuevos-ingresos/submit', $this->formulario())->assertCreated();
        $this->assertDatabaseHas('respuestas_ingresos', ['documento' => '5551234']);
    }

    public function test_prefill_con_token_cifrado_devuelve_datos_del_ingreso(): void
    {
        $this->ingreso();
        $token = urlencode(Crypt::encryptString('5551234'));

        $this->getJson('/api/registro-nuevos-ingresos/prefill?token=' . $token)->assertOk()
            ->assertJsonPath('documento', '5551234')->assertJsonPath('nombres', 'PEDRO')->assertJsonPath('apellidos', 'PICAPIEDRA')
            ->assertJsonPath('correo', 'pedro@test.co');
    }

    public function test_prefill_y_resolve_token_rechazan_tokens_invalidos(): void
    {
        $this->getJson('/api/registro-nuevos-ingresos/prefill?token=basura')->assertStatus(400);
        $this->getJson('/api/carga-documentos/resolve-token?token=basura')->assertStatus(400);

        $tokenSinIngreso = urlencode(Crypt::encryptString('00000'));
        $this->getJson('/api/registro-nuevos-ingresos/prefill?token=' . $tokenSinIngreso)->assertStatus(404);
    }

    public function test_resolve_token_devuelve_documento_nombre_y_correo(): void
    {
        $this->ingreso();
        $token = urlencode(Crypt::encryptString('5551234'));

        $this->getJson('/api/carga-documentos/resolve-token?token=' . $token)->assertOk()
            ->assertJson(['documento' => '5551234', 'nombre' => 'PEDRO PICAPIEDRA', 'correo' => 'pedro@test.co']);
    }

    // ── Carga pública de documentos ──────────────────────────────────────────

    private function subir(string $tipo, string $documento = '5551234', array $extra = [])
    {
        return $this->post('/api/documentos-contratacion/upload', array_merge([
            'documento' => $documento, 'tipo' => $tipo, 'archivo' => UploadedFile::fake()->create("$tipo.pdf", 100, 'application/pdf'),
        ], $extra), ['Accept' => 'application/json']);
    }

    public function test_subir_un_documento_es_publico_y_queda_registrado(): void
    {
        $this->subir('hoja_vida')->assertCreated();

        $meta = json_decode(file_get_contents($this->metaPath), true);
        $this->assertArrayHasKey('hoja_vida', $meta['5551234']['archivos']);
        Storage::disk('local')->assertExists($meta['5551234']['archivos']['hoja_vida']['ruta']);
    }

    public function test_la_carga_valida_campos_y_tamano_maximo(): void
    {
        $this->post('/api/documentos-contratacion/upload', [], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors(['documento', 'tipo', 'archivo']);

        $this->subir('hoja_vida', '5551234', ['archivo' => UploadedFile::fake()->create('grande.pdf', 11 * 1024, 'application/pdf')])
            ->assertStatus(422)->assertJsonValidationErrors('archivo');
    }

    public function test_al_completar_los_siete_documentos_se_envia_un_solo_correo(): void
    {
        $this->ingreso();

        foreach (self::DOCS_OBLIGATORIOS as $i => $tipo) {
            $this->subir($tipo)->assertCreated();
            if ($i < count(self::DOCS_OBLIGATORIOS) - 1) {
                Mail::assertNothingSent();
            }
        }
        Mail::assertSent(DocumentosCompletadosMail::class, 1);

        // Volver a subir uno no reenvía
        $this->subir('hoja_vida')->assertCreated();
        Mail::assertSent(DocumentosCompletadosMail::class, 1);
    }

    public function test_documentos_medicos_por_evento_no_cuentan_como_obligatorios(): void
    {
        $this->ingreso();
        $this->subir('examen_ingreso', '5551234', ['evento' => '2026-09-01'])->assertCreated();

        $meta = json_decode(file_get_contents($this->metaPath), true);
        $this->assertArrayHasKey('examen_ingreso', $meta['5551234']['archivos_eventos']['2026-09-01']);
        $this->assertArrayNotHasKey('examen_ingreso', $meta['5551234']['archivos'] ?? []);
        Mail::assertNothingSent();
    }

    public function test_consultar_descargar_y_eliminar_documentos_es_solo_para_th_tic_admin(): void
    {
        $this->subir('hoja_vida')->assertCreated();

        $this->actuarComo('consultor');
        $this->getJson('/api/documentos-contratacion/5551234')->assertForbidden();
        $this->get('/api/documentos-contratacion/5551234/hoja_vida/download')->assertForbidden();
        $this->deleteJson('/api/documentos-contratacion/5551234/hoja_vida')->assertForbidden();

        $this->actuarComo('th');
        $this->getJson('/api/documentos-contratacion/5551234')->assertOk()->assertJsonPath('archivos.hoja_vida.nombre_original', 'hoja_vida.pdf');
        $this->get('/api/documentos-contratacion/5551234/hoja_vida/download')->assertOk();
        $this->deleteJson('/api/documentos-contratacion/5551234/hoja_vida')->assertNoContent();
        $this->getJson('/api/documentos-contratacion/5551234/hoja_vida/download')->assertNotFound();
    }

    public function test_un_documento_inexistente_devuelve_404(): void
    {
        $this->actuarComo('th');

        $this->get('/api/documentos-contratacion/000/hoja_vida/download')->assertNotFound();
        $this->deleteJson('/api/documentos-contratacion/000/hoja_vida')->assertNotFound();
    }

    public function test_datos_para_contrato_solo_incluye_a_quien_completo_los_siete_documentos(): void
    {
        $this->actuarComo('th');
        RespuestaIngreso::create(collect($this->formulario())->except('fotografia')->all());
        RespuestaIngreso::create(collect($this->formulario(['documento' => '888', 'correo' => 'otro@test.co']))->except('fotografia')->all());

        foreach (self::DOCS_OBLIGATORIOS as $tipo) {
            $this->subir($tipo, '5551234')->assertCreated();
        }
        $this->subir('hoja_vida', '888')->assertCreated(); // incompleto

        $docs = collect($this->getJson('/api/respuestas-ingresos/datos-contrato')->assertOk()->json())->pluck('documento');

        $this->assertSame(['5551234'], $docs->all());
    }

    public function test_listar_y_eliminar_respuestas_del_formulario(): void
    {
        $this->actuarComo('th');
        $r = RespuestaIngreso::create(collect($this->formulario())->except('fotografia')->all());

        $this->getJson('/api/respuestas-ingresos')->assertOk()->assertJsonFragment(['documento' => '5551234']);
        $this->deleteJson("/api/respuestas-ingresos/{$r->id}")->assertNoContent();
        $this->deleteJson("/api/respuestas-ingresos/{$r->id}")->assertNotFound();
    }
}
