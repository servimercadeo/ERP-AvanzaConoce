<?php

namespace Tests\Feature\Seleccion;

use App\Models\Candidato;
use App\Models\Requisicion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Administrativo > Selección: requisiciones, formulario público de registro de candidatos,
 * gestión de candidatos y la cadena de requisitos (pruebas -> aval).
 */
class RequisicionesYCandidatosTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    private function empresa(string $nombre): int
    {
        return DB::table('empresas')->insertGetId(['nombre' => $nombre, 'pais' => 'Colombia', 'activo' => 1, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function proyectoId(string $nombre): int
    {
        return (int) DB::table('proyectos')->where('nombre', $nombre)->value('id');
    }

    private ?array $ubicacion = null;

    /** Sede y regional, obligatorias al crear una requisición. */
    private function ubicacion(): array
    {
        return $this->ubicacion ??= [
            'regional_id' => DB::table('regionales')->insertGetId(['nombre' => $this->unico('REGIONAL'), 'created_at' => now(), 'updated_at' => now()]),
            'sede_id'     => DB::table('sedes')->insertGetId(['nombre' => $this->unico('SEDE'), 'created_at' => now(), 'updated_at' => now()]),
        ];
    }

    private function requisicion(array $extra = []): array
    {
        return $this->postJson('/api/requisiciones', array_merge(['fecha_solicitud' => '2026-09-01', 'requeridas' => 1], $this->ubicacion(), $extra))
            ->assertCreated()->json();
    }

    /** Requisición ya cerrada (sin pasar por la validación de vacantes, como las históricas). */
    private function requisicionCompletada(): array
    {
        $req = $this->requisicion();
        Requisicion::whereKey($req['id'])->update(['estado' => 'Completada']);

        return $req;
    }

    private function ciudadId(): int
    {
        // ciudades.id no es autoincremental (viene de un catálogo fijo): se asigna a mano.
        $id = (int) DB::table('ciudades')->max('id') + 1;
        DB::table('ciudades')->insert(['id' => $id, 'nombre' => $this->unico('CIUDAD'), 'created_at' => now(), 'updated_at' => now()]);

        return $id;
    }

    // ── Requisiciones ────────────────────────────────────────────────────────

    public function test_la_numeracion_de_requisiciones_es_consecutiva_desde_req65(): void
    {
        $this->actuarComo('th');

        $a = $this->requisicion()['nro_identificacion_proceso'];
        $b = $this->requisicion()['nro_identificacion_proceso'];

        $this->assertSame('REQ65', $a);
        $this->assertSame('REQ66', $b);
    }

    public function test_requisicion_exige_fecha_de_solicitud(): void
    {
        $this->actuarComo('th');

        $this->postJson('/api/requisiciones', [])->assertStatus(422)->assertJsonValidationErrors('fecha_solicitud');
    }

    public function test_requisicion_respeta_la_regla_empresa_proyecto(): void
    {
        $this->actuarComo('th');
        $servimercadeo = $this->empresa('SERVIMERCADEO COL');

        $this->postJson('/api/requisiciones', [
            'fecha_solicitud' => '2026-09-01', 'requeridas' => 1, 'empresa_id' => $servimercadeo, 'proyecto_id' => $this->proyectoId('TIGO HOME'),
        ] + $this->ubicacion())->assertStatus(422)->assertJsonValidationErrors('proyecto_id');

        $this->postJson('/api/requisiciones', [
            'fecha_solicitud' => '2026-09-01', 'requeridas' => 1, 'empresa_id' => $servimercadeo, 'proyecto_id' => $this->proyectoId('DIRECTV CO'),
        ] + $this->ubicacion())->assertCreated();

        // Servimercadeo también tiene personal administrativo.
        $administrativo = $this->proyectoId('ADMINISTRATIVO') ?: DB::table('proyectos')->insertGetId([
            'nombre' => 'ADMINISTRATIVO', 'activo' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->postJson('/api/requisiciones', [
            'fecha_solicitud' => '2026-09-01', 'requeridas' => 1, 'empresa_id' => $servimercadeo, 'proyecto_id' => $administrativo,
        ] + $this->ubicacion())->assertCreated();
    }

    public function test_requisicion_exige_la_empresa_del_empleador_directo(): void
    {
        $this->actuarComo('th');
        $sym = $this->empresa('Servicios y Mercadeo COL');
        // empleadores.id no es autoincremental: se asigna a mano.
        $servimercadeo = (int) DB::table('empleadores')->max('id') + 1;
        $temporal = $servimercadeo + 1;
        DB::table('empleadores')->insert([
            ['id' => $servimercadeo, 'nombre' => 'SERVIMERCADEO', 'tipo' => 'Directo', 'created_at' => now(), 'updated_at' => now()],
            ['id' => $temporal, 'nombre' => 'STAFFING', 'tipo' => 'Indirecto', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->postJson('/api/requisiciones', [
            'fecha_solicitud' => '2026-09-01', 'requeridas' => 1, 'empresa_id' => $sym, 'empleador_id' => $servimercadeo,
        ] + $this->ubicacion())->assertStatus(422)->assertJsonValidationErrors('empresa_id');

        $req = $this->requisicion(['empresa_id' => $sym, 'empleador_id' => $temporal]);

        // Al editar se valida contra lo ya guardado: cambiar solo el empleador también se bloquea.
        $this->putJson("/api/requisiciones/{$req['id']}", ['empleador_id' => $servimercadeo])
            ->assertStatus(422)->assertJsonValidationErrors('empresa_id');
    }

    public function test_requisicion_exige_sede_y_regional(): void
    {
        $this->actuarComo('th');

        $this->postJson('/api/requisiciones', ['fecha_solicitud' => '2026-09-01', 'requeridas' => 1])
            ->assertStatus(422)->assertJsonValidationErrors(['sede_id', 'regional_id']);
    }

    public function test_al_editar_se_valida_contra_la_empresa_ya_guardada(): void
    {
        $this->actuarComo('th');
        $req = $this->requisicion(['empresa_id' => $this->empresa('SERVIMERCADEO COL')]);

        $this->putJson("/api/requisiciones/{$req['id']}", ['proyecto_id' => $this->proyectoId('TIGO EXPRESS')])
            ->assertStatus(422)->assertJsonValidationErrors('proyecto_id');
    }

    public function test_cambiar_el_proyecto_de_una_requisicion_actualiza_los_contratos_de_sus_candidatos(): void
    {
        $this->actuarComo('th');
        $req = $this->requisicion();
        $emp = $this->usuario('general', ['cedula' => '9001']);
        Candidato::create([
            'requisicion_id' => $req['id'], 'nombres' => 'X', 'identificacion' => '9001', 'correo' => 'x@test.co',
            'fecha_postulacion' => now()->toDateString(),
        ]);
        $contratoId = DB::table('contratos')->insertGetId([
            'empleado_id' => $emp->id, 'cliente_proyecto' => 'VIEJO', 'estado_contrato' => 'Activo',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->putJson("/api/requisiciones/{$req['id']}", ['proyecto_id' => $this->proyectoId('TIGO HOME')])->assertOk();

        $this->assertDatabaseHas('contratos', ['id' => $contratoId, 'cliente_proyecto' => 'TIGO HOME']);
    }

    public function test_requisicion_exige_numero_de_vacantes(): void
    {
        $this->actuarComo('th');

        $this->postJson('/api/requisiciones', ['fecha_solicitud' => '2026-09-01'])
            ->assertStatus(422)->assertJsonValidationErrors('requeridas');
        $this->postJson('/api/requisiciones', ['fecha_solicitud' => '2026-09-01', 'requeridas' => 0])
            ->assertStatus(422)->assertJsonValidationErrors('requeridas');

        $this->assertSame(3, $this->requisicion(['requeridas' => 3])['requeridas']);
    }

    public function test_requisicion_no_se_cierra_hasta_cubrir_todas_las_vacantes(): void
    {
        $this->actuarComo('th');
        $req = $this->requisicion(['requeridas' => 2]);
        $cerrar = fn () => $this->putJson("/api/requisiciones/{$req['id']}", ['estado' => 'Completada']);

        // No puede nacer cerrada.
        $this->postJson('/api/requisiciones', ['fecha_solicitud' => '2026-09-01', 'requeridas' => 1, 'estado' => 'Completada'] + $this->ubicacion())
            ->assertStatus(422)->assertJsonValidationErrors('estado');

        // 1 de 2 vacantes cubiertas (el candidato sin aval no cuenta).
        $this->candidato(['requisicion_id' => $req['id'], 'aval' => true]);
        $this->candidato(['requisicion_id' => $req['id'], 'aval' => false]);
        $cerrar()->assertStatus(422)->assertJsonPath('errors.estado.0', fn ($m) => str_contains($m, '1 de 2'));
        $this->assertSame('Abierta', Requisicion::find($req['id'])->estado);

        // Cancelar sí se permite aunque falten vacantes.
        $this->putJson("/api/requisiciones/{$req['id']}", ['estado' => 'Cancelada'])->assertOk();
        $this->putJson("/api/requisiciones/{$req['id']}", ['estado' => 'En proceso'])->assertOk();

        // Con 2 de 2 ya se puede cerrar, y el listado muestra las vacantes cubiertas.
        $this->candidato(['requisicion_id' => $req['id'], 'aval' => true]);
        $cerrar()->assertOk()->assertJsonPath('vacantes_cubiertas', 2);
        $fila = collect($this->getJson('/api/requisiciones')->json())->firstWhere('id', $req['id']);
        $this->assertSame(2, $fila['vacantes_cubiertas']);

        // Subir las vacantes de una requisición cerrada la reabre; volver a bajarlas la cierra sola.
        $this->putJson("/api/requisiciones/{$req['id']}", ['requeridas' => 3])->assertOk();
        $this->assertSame('En proceso', Requisicion::find($req['id'])->estado);
        $this->putJson("/api/requisiciones/{$req['id']}", ['requeridas' => 2])->assertOk();
        $this->assertSame('Completada', Requisicion::find($req['id'])->estado);
    }

    public function test_la_requisicion_se_cierra_sola_al_cubrir_las_vacantes_y_se_reabre_al_liberar_una(): void
    {
        $this->actuarComo('th');
        $req = $this->requisicion(['requeridas' => 2]);
        $avalar = function () use ($req) {
            $c = $this->candidato(['requisicion_id' => $req['id'], 'pruebas' => true]);
            $this->subirDocumentos($c);

            return [$c, $this->putJson("/api/candidatos/{$c->id}", [
                'aval' => true, 'tasa_riesgo_arl' => 'I', 'salario_basico' => 1500000, 'tipo_vinculacion' => 'Directa',
                'correos_aval' => [],
            ])];
        };
        $estado = fn () => Requisicion::find($req['id'])->estado;

        [$primero, $r] = $avalar();
        $r->assertOk();
        $this->assertSame('Abierta', $estado());

        [, $r] = $avalar();
        $r->assertOk();
        $this->assertSame('Completada', $estado(), 'Con 2 de 2 vacantes cubiertas debe cerrarse sola.');

        // Ya no admite más avales que vacantes.
        [, $r] = $avalar();
        $r->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'vacantes cubiertas'));

        // Quitar un aval libera una vacante y la requisición se reabre.
        $this->putJson("/api/candidatos/{$primero->id}", ['aval' => false])->assertOk();
        $this->assertSame('En proceso', $estado());
    }

    public function test_listar_filtrar_ver_y_eliminar_requisiciones(): void
    {
        $this->actuarComo('th');
        $abierta = $this->requisicion(['responsable' => 'BUSCAME']);
        $cerrada = $this->requisicionCompletada();

        $porEstado = collect($this->getJson('/api/requisiciones?estado=Completada')->json())->pluck('id');
        $this->assertTrue($porEstado->contains($cerrada['id']));
        $this->assertFalse($porEstado->contains($abierta['id']));

        $this->assertSame([$abierta['id']], collect($this->getJson('/api/requisiciones?search=BUSCAME')->json())->pluck('id')->all());
        $this->getJson("/api/requisiciones/{$abierta['id']}")->assertOk();

        $this->deleteJson("/api/requisiciones/{$abierta['id']}")->assertNoContent();
        $this->assertDatabaseMissing('requisiciones', ['id' => $abierta['id']]);
    }

    // ── Formulario público de registro de candidatos ────────────────────────

    private function registro(array $extra = []): array
    {
        return array_merge([
            'documento' => '1234567', 'nombres' => 'juan', 'apellidos' => 'perez', 'edad' => 25, 'genero' => 'Masculino',
            'fecha_expedicion' => '2015-05-05', 'ciudad_id' => $this->ciudadId(), 'celular' => '3001112233', 'correo' => 'juan@test.co',
        ], $extra);
    }

    public function test_registro_publico_de_candidato_no_requiere_sesion_y_queda_en_entrevista_sin_aval(): void
    {
        $id = $this->postJson('/api/candidatos/registro', $this->registro())->assertCreated()->json('id');

        $c = Candidato::find($id);
        $this->assertSame('JUAN PEREZ', $c->nombres);
        $this->assertSame('Entrevista', $c->estado);
        $this->assertFalse((bool) $c->aval);
        $this->assertFalse((bool) $c->pruebas);
    }

    public function test_registro_publico_valida_los_datos(): void
    {
        $this->postJson('/api/candidatos/registro', [])->assertStatus(422)
            ->assertJsonValidationErrors(['documento', 'nombres', 'apellidos', 'edad', 'fecha_expedicion', 'ciudad_id', 'celular', 'correo']);
        $this->postJson('/api/candidatos/registro', $this->registro(['edad' => 10]))->assertStatus(422)->assertJsonValidationErrors('edad');
        $this->postJson('/api/candidatos/registro', $this->registro(['correo' => 'no-es-correo']))->assertStatus(422)->assertJsonValidationErrors('correo');
    }

    public function test_registro_con_token_vincula_la_requisicion_y_rechaza_las_cerradas(): void
    {
        $this->actuarComo('th');
        $abierta = $this->requisicion();
        $completada = $this->requisicionCompletada();
        $tokenAbierta = Requisicion::find($abierta['id'])->registro_token;
        $tokenCompletada = Requisicion::find($completada['id'])->registro_token;
        $this->assertNotEmpty($tokenAbierta, 'Toda requisición debe tener token de registro.');

        $id = $this->postJson('/api/candidatos/registro', $this->registro(['token' => $tokenAbierta]))->assertCreated()->json('id');
        $this->assertSame($abierta['id'], Candidato::find($id)->requisicion_id);

        $this->postJson('/api/candidatos/registro', $this->registro([
            'token' => $tokenCompletada, 'documento' => '7654321', 'correo' => 'otra@test.co',
        ]))->assertStatus(409);
    }

    public function test_registro_rechaza_cedula_y_correo_ya_registrados(): void
    {
        $this->postJson('/api/candidatos/registro', $this->registro())->assertCreated();

        // Misma cédula: ya está registrado.
        $this->postJson('/api/candidatos/registro', $this->registro(['correo' => 'nuevo@test.co']))
            ->assertStatus(422)->assertJsonValidationErrors('documento');

        // Otra cédula con el correo de otra persona.
        $this->postJson('/api/candidatos/registro', $this->registro(['documento' => '7654321']))
            ->assertStatus(422)->assertJsonValidationErrors('correo');

        // Otra cédula y otro correo: se registra.
        $this->postJson('/api/candidatos/registro', $this->registro(['documento' => '7654321', 'correo' => 'otra@test.co']))
            ->assertCreated();
    }

    public function test_catalogos_del_formulario_publico_incluyen_el_negocio_de_la_requisicion(): void
    {
        $this->actuarComo('th');
        $req = $this->requisicion(['proyecto_id' => $this->proyectoId('TIGO HOME')]);
        $token = Requisicion::find($req['id'])->registro_token;

        $this->getJson('/api/registro/catalogos?token=' . $token)->assertOk()
            ->assertJsonPath('negocio', 'TIGO HOME')->assertJsonPath('estado', 'Abierta')
            ->assertJsonStructure(['ciudades', 'proyectos', 'eps', 'fondos_pensiones', 'estados_civil', 'tipos_rh']);
    }

    // ── Gestión de candidatos (aval / pruebas) ───────────────────────────────

    private function candidato(array $extra = []): Candidato
    {
        return Candidato::create(array_merge([
            'nombres' => 'CANDIDATO PRUEBA', 'identificacion' => (string) random_int(10000000, 99999999),
            'correo' => 'cand@test.co', 'fecha_postulacion' => now()->toDateString(),
        ], $extra));
    }

    private function subirDocumentos(Candidato $c): void
    {
        foreach (['Hoja de vida', 'Pruebas psicotécnicas'] as $nombre) {
            $c->documentos()->create(['nombre' => $nombre, 'ruta' => 'x/' . $nombre, 'nombre_original' => $nombre . '.pdf']);
        }
    }

    public function test_activar_pruebas_exige_hoja_de_vida_y_pruebas_psicotecnicas(): void
    {
        $this->actuarComo('th');
        $c = $this->candidato();

        $this->putJson("/api/candidatos/{$c->id}", ['pruebas' => true])->assertStatus(422);
        $this->assertFalse((bool) $c->fresh()->pruebas);

        $this->subirDocumentos($c);
        $this->putJson("/api/candidatos/{$c->id}", ['pruebas' => true])->assertOk();
        $this->assertTrue((bool) $c->fresh()->pruebas);
    }

    public function test_activar_aval_exige_pruebas_remuneracion_y_documentos(): void
    {
        $this->actuarComo('th');
        $c = $this->candidato();

        $this->putJson("/api/candidatos/{$c->id}", ['aval' => true])->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'Pruebas psicotécnicas'));

        $this->subirDocumentos($c);
        $c->update(['pruebas' => true]);

        // Sin salario ni tasa ARL
        $this->putJson("/api/candidatos/{$c->id}", ['aval' => true])->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'Salario básico'));

        $this->assertFalse((bool) $c->fresh()->aval);
    }

    public function test_en_proyectos_tigo_el_aval_exige_completar_la_entrevista(): void
    {
        $this->actuarComo('th');
        $req = $this->requisicion(['proyecto_id' => $this->proyectoId('TIGO HOME')]);
        $c = $this->candidato(['requisicion_id' => $req['id'], 'pruebas' => true, 'asmt_prom' => 4]);
        $this->subirDocumentos($c);

        $this->putJson("/api/candidatos/{$c->id}", [
            'aval' => true, 'tasa_riesgo_arl' => 'I', 'salario_basico' => 1500000, 'tipo_vinculacion' => 'Directa',
            'correos_aval' => [],
        ])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Entrevista'));
    }

    public function test_aval_completo_se_activa_cuando_se_cumplen_todos_los_requisitos(): void
    {
        $this->actuarComo('th');
        $c = $this->candidato(['pruebas' => true]);
        $this->subirDocumentos($c);

        $r = $this->putJson("/api/candidatos/{$c->id}", [
            'aval' => true, 'tasa_riesgo_arl' => 'I', 'salario_basico' => 1500000, 'tipo_vinculacion' => 'Directa',
            'correos_aval' => [],
        ]);
        $r->assertOk();

        $this->assertTrue((bool) $c->fresh()->aval);
    }

    public function test_los_correos_de_aval_deben_estar_en_la_lista_permitida(): void
    {
        $this->actuarComo('th');
        $c = $this->candidato(['pruebas' => true]);
        $this->subirDocumentos($c);

        $this->putJson("/api/candidatos/{$c->id}", [
            'aval' => true, 'tasa_riesgo_arl' => 'I', 'salario_basico' => 1500000, 'tipo_vinculacion' => 'Directa',
            'correos_aval' => ['intruso@otro.com'],
        ])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'destinatarios'));

        Mail::assertNothingSent();
    }

    public function test_aval_directo_solo_acepta_contactos_de_empleadores_directos(): void
    {
        $this->actuarComo('th');
        $c = $this->candidato(['pruebas' => true]);
        $this->subirDocumentos($c);

        $idDirecto = (int) DB::table('empleadores')->max('id') + 1;
        DB::table('empleadores')->insert([
            ['id' => $idDirecto, 'nombre' => $this->unico('DIRECTO'), 'tipo' => 'Directo', 'created_at' => now(), 'updated_at' => now()],
            ['id' => $idDirecto + 1, 'nombre' => $this->unico('INDIRECTO'), 'tipo' => 'Indirecto', 'created_at' => now(), 'updated_at' => now()],
        ]);
        DB::table('empleador_contactos')->insert([
            ['empleador_id' => $idDirecto, 'nombre' => 'Nómina', 'correo' => 'nomina@directo.co', 'created_at' => now(), 'updated_at' => now()],
            ['empleador_id' => $idDirecto + 1, 'nombre' => 'Temporal', 'correo' => 'contacto@temporal.co', 'created_at' => now(), 'updated_at' => now()],
        ]);
        $aval = fn (array $correos) => $this->putJson("/api/candidatos/{$c->id}", [
            'aval' => true, 'tasa_riesgo_arl' => 'I', 'salario_basico' => 1500000, 'tipo_vinculacion' => 'Directa',
            'correos_aval' => $correos,
        ]);

        // Un contacto de un empleador Indirecto no sirve para vinculación Directa.
        $aval(['contacto@temporal.co'])->assertStatus(422);
        Mail::assertNothingSent();

        $aval(['nomina@directo.co'])->assertOk();
        Mail::assertSent(\App\Mail\AvalContratacionMail::class, fn ($m) => $m->hasTo('nomina@directo.co'));
    }

    public function test_quitar_el_aval_regresa_al_candidato_a_entrevista(): void
    {
        $this->actuarComo('th');
        $c = $this->candidato(['pruebas' => true, 'aval' => true, 'estado' => 'Contratación']);

        $this->putJson("/api/candidatos/{$c->id}", ['aval' => false, 'estado' => 'Contratación'])->assertOk();

        $this->assertFalse((bool) $c->fresh()->aval);
        $this->assertSame('Entrevista', $c->fresh()->estado);
    }

    public function test_crear_candidato_desde_el_panel_valida_campos_obligatorios(): void
    {
        $this->actuarComo('th');

        $this->postJson('/api/candidatos', [])->assertStatus(422)->assertJsonValidationErrors(['nombres', 'identificacion', 'correo']);
    }

    public function test_eliminar_candidato(): void
    {
        $this->actuarComo('th');
        $c = $this->candidato();

        $this->deleteJson("/api/candidatos/{$c->id}")->assertNoContent();
        $this->assertDatabaseMissing('candidatos', ['id' => $c->id]);
    }
}
