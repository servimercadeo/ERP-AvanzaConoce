<?php

namespace Tests\Feature\Inventario;

use App\Models\Aliado;
use App\Models\Proyecto;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as Peticion;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class AliadosTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    /** Ids de Parámetros > Proyectos, por nombre. */
    private array $proyecto = [];

    /** Usuario elegible como jefe inmediato del aliado. */
    private int $jefe;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['DIRECTV', 'HUGHES COL', 'TIGO HOME', 'TIGO EXPRESS', 'ADMINISTRATIVO'] as $nombre) {
            $this->proyecto[$nombre] = Proyecto::firstOrCreate(['nombre' => $nombre], ['activo' => true])->id;
        }
        $this->jefe = $this->usuario('operaciones', ['name' => 'COORDINADOR OPERACIONES'])->id;

        // Catálogo de modalidades de AvanzaConoce (tabla sin prefijo; en producción es la de
        // AvanzaConoce). Temporal: no hace commit implícito dentro de la transacción del test.
        \DB::statement('CREATE TEMPORARY TABLE IF NOT EXISTS `modalidades_bt` (id INT PRIMARY KEY, id_bt INT, nombre VARCHAR(100))');
        \DB::statement("INSERT IGNORE INTO `modalidades_bt` VALUES (3, 26359, 'ALIADO TIPO A'), (8, 26313, 'SUBAGENTE'), (38, 59838, 'ALIADO TIPO B')");
    }

    private function empresa(array $extra = []): array
    {
        return array_merge([
            'tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900123456-7',
            'nombre' => 'TECNOMARIN S.A.S', 'telefono' => '3001112233', 'ciudad' => 'MEDELLIN',
            'correo' => 'contacto@tecnomarin.co', 'direccion' => 'Calle 10 # 20-30',
            'codigo_pdv' => '39582', 'modalidad_id_bt' => 26359,
            'proyectos' => [$this->proyecto['DIRECTV'], $this->proyecto['HUGHES COL']],
            'jefe_inmediato_id' => $this->jefe,
        ], $extra);
    }

    private function persona(array $extra = []): array
    {
        return array_merge([
            'cedula' => '1020304050', 'nombres' => 'Pedro', 'apellidos' => 'Pérez',
            'movil' => '3104445566', 'email' => 'pedro.perez@test.co',
            'tipo_documento' => 'CC', 'proyectos' => [$this->proyecto['DIRECTV']],
            'jefe_inmediato_id' => $this->jefe, 'ciudad' => 'PEREIRA', 'direccion' => 'Carrera 5 # 1-2',
        ], $extra);
    }

    private function nombresProyectos($respuesta, string $ruta = 'aliado.proyectos'): array
    {
        return collect($respuesta->json($ruta))->pluck('nombre')->sort()->values()->all();
    }

    public function test_aliado_tipo_empresa_crea_solo_el_aliado(): void
    {
        $this->actuarComo('admin');

        $this->postJson('/api/aliados', $this->empresa())
            ->assertCreated()->assertJsonPath('credenciales', null);

        $aliado = Aliado::firstOrFail();
        $this->assertSame('empresa', $aliado->tipo);
        $this->assertSame(0, $aliado->tecnicos()->count());
    }

    public function test_aliado_empresa_se_crea_completo_y_correcto(): void
    {
        $this->actuarComo('admin');
        Http::fake();

        $r = $this->postJson('/api/aliados', $this->empresa([
            'nombre' => '  Satelital Carvajal Acevedo S.A.S ', 'correo' => 'Gerencia@SATELITAL.co', 'observaciones' => 'Opera en el Eje Cafetero',
        ]))->assertCreated();

        // Respuesta (integración con AvanzaConoce apagada): sin credenciales y con sus relaciones.
        $r->assertJsonPath('credenciales', null)
            ->assertJsonPath('aliado.jefe_inmediato.name', 'COORDINADOR OPERACIONES');
        $this->assertSame(['DIRECTV', 'HUGHES COL'], $this->nombresProyectos($r));

        // En la base: cada campo del formulario quedó guardado.
        $aliado = Aliado::firstOrFail();
        $this->assertSame([
            'tipo' => 'empresa', 'tipo_documento' => 'NIT', 'documento' => '900123456-7',
            'nombre' => 'Satelital Carvajal Acevedo S.A.S', 'codigo_pdv' => '39582', 'modalidad_id_bt' => 26359,
            'telefono' => '3001112233', 'correo' => 'Gerencia@SATELITAL.co', 'ciudad' => 'MEDELLIN',
            'direccion' => 'Calle 10 # 20-30', 'observaciones' => 'Opera en el Eje Cafetero',
            'jefe_inmediato_id' => $this->jefe, 'activo' => true,
        ], collect($aliado->toArray())->only([
            'tipo', 'tipo_documento', 'documento', 'nombre', 'codigo_pdv', 'modalidad_id_bt', 'telefono', 'correo',
            'ciudad', 'direccion', 'observaciones', 'jefe_inmediato_id', 'activo',
        ])->all());
        $this->assertArrayNotHasKey('contacto_nombre', $aliado->getAttributes());

        // Solo se crea el aliado: ningún usuario técnico ni del ERP; con la integración apagada nada se envía.
        $this->assertSame(0, $aliado->tecnicos()->count());
        $this->assertSame(0, User::where('rol', 'tecnico')->count());
        Http::assertNothingSent();

        // Aparece en la lista (filtros y resumen) y su ficha trae todo.
        $lista = $this->getJson('/api/aliados?page=1&tipo=empresa&proyecto=' . $this->proyecto['HUGHES COL'])->assertOk();
        $this->assertSame([1, 1, 0], [$lista->json('total'), $lista->json('resumen.empresa'), $lista->json('resumen.tecnico')]);
        $this->assertSame($aliado->id, $lista->json('data.0.id'));
        $this->getJson("/api/aliados/{$aliado->id}")->assertOk()
            ->assertJsonPath('modalidad_id_bt', 26359)->assertJsonPath('codigo_pdv', '39582')->assertJsonCount(0, 'tecnicos');

        // Después se le agregan técnicos desde su ficha.
        $this->postJson("/api/aliados/{$aliado->id}/tecnicos", $this->persona())->assertCreated();
        $this->assertSame(1, $aliado->tecnicos()->count());

        // Un documento repetido no crea otro aliado.
        $this->postJson('/api/aliados', $this->empresa())->assertStatus(422)
            ->assertJsonPath('errors.documento.0', 'Ya existe un aliado con ese número de documento.');
        $this->assertSame(1, Aliado::count());
    }

    public function test_aliado_tipo_tecnico_crea_el_aliado_y_su_usuario_tecnico_con_los_mismos_datos(): void
    {
        $this->actuarComo('admin');

        $credenciales = $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona(['ciudad' => 'CALI']))
            ->assertCreated()->json('credenciales');

        $aliado = Aliado::firstOrFail();
        $this->assertSame(['tecnico', 'CC', '1020304050', 'PEDRO PÉREZ'], [$aliado->tipo, $aliado->tipo_documento, $aliado->documento, $aliado->nombre]);

        $tecnico = User::where('cedula', '1020304050')->firstOrFail();
        $this->assertSame([$aliado->id, 'tecnico', 'PEDRO', 'PÉREZ', 'pedro.perez@test.co', 'Indirecto'],
            [$tecnico->aliado_id, $tecnico->rol, $tecnico->nombres, $tecnico->apellidos, $tecnico->email, $tecnico->tipo_vinculacion]);
        $this->assertTrue($tecnico->activo && !$tecnico->pendiente_alta);

        // Con las credenciales que se le muestran puede entrar al ERP.
        $this->assertSame('pedro.perez@test.co', $credenciales['email']);
        $this->assertTrue(Hash::check($credenciales['password'], $tecnico->password));
    }

    public function test_guarda_el_tipo_de_documento_y_los_proyectos(): void
    {
        $this->actuarComo('admin');

        $r = $this->postJson('/api/aliados', $this->empresa())->assertCreated();
        $this->assertSame(['DIRECTV', 'HUGHES COL'], $this->nombresProyectos($r));
        $r = $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona([
            'tipo_documento' => 'CE', 'proyectos' => [$this->proyecto['TIGO HOME'], $this->proyecto['TIGO EXPRESS']],
        ]))->assertCreated()->assertJsonPath('aliado.tipo_documento', 'CE');
        $this->assertSame(['TIGO EXPRESS', 'TIGO HOME'], $this->nombresProyectos($r));

        // Filtro por proyecto (id): cada aliado aparece en los proyectos que marcó.
        $nombres = fn (string $p) => collect($this->getJson('/api/aliados?proyecto=' . $this->proyecto[$p])->json())->pluck('nombre')->all();
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('HUGHES COL'));
        $this->assertSame(['PEDRO PÉREZ'], $nombres('TIGO HOME'));
        $this->assertSame(['PEDRO PÉREZ'], $nombres('TIGO EXPRESS'));
    }

    public function test_lista_por_paginas_de_10_con_resumen_de_todos_los_filtrados(): void
    {
        $this->actuarComo('admin');
        foreach (range(1, 12) as $i) {
            $this->postJson('/api/aliados', $this->empresa(['documento' => "90000000{$i}", 'nombre' => sprintf('EMPRESA %02d', $i)]))->assertCreated();
        }
        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona())->assertCreated();

        $p1 = $this->getJson('/api/aliados?page=1')->assertOk();
        $this->assertCount(10, $p1->json('data'));
        $this->assertSame([13, 2, 10], [$p1->json('total'), $p1->json('last_page'), $p1->json('per_page')]);
        $this->assertSame(['aliados' => 13, 'empresa' => 12, 'tecnico' => 1, 'tecnicos' => 1], $p1->json('resumen'));
        $this->assertSame('EMPRESA 01', $p1->json('data.0.nombre'));
        $this->assertArrayHasKey('work_orders', $p1->json('data.0'));

        $p2 = $this->getJson('/api/aliados?page=2')->assertOk();
        $this->assertSame(['EMPRESA 11', 'EMPRESA 12', 'PEDRO PÉREZ'], collect($p2->json('data'))->pluck('nombre')->all());

        // El resumen y el total siguen a los filtros, no a la página.
        $soloTecnicos = $this->getJson('/api/aliados?page=1&tipo=tecnico')->assertOk();
        $this->assertSame(1, $soloTecnicos->json('total'));
        $this->assertSame(['aliados' => 1, 'empresa' => 0, 'tecnico' => 1, 'tecnicos' => 1], $soloTecnicos->json('resumen'));
    }

    public function test_filtros_de_busqueda_tipo_y_proyecto_combinados(): void
    {
        $this->actuarComo('admin');
        $empresa = $this->postJson('/api/aliados', $this->empresa())->assertCreated()->json('aliado.id');
        $this->postJson("/api/aliados/{$empresa}/tecnicos", $this->persona(['cedula' => '1111222233', 'nombres' => 'Laura', 'apellidos' => 'Gómez', 'email' => 'laura@test.co', 'movil' => '3109998877']))->assertCreated();
        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona([
            'proyectos' => [$this->proyecto['TIGO HOME']],
        ]))->assertCreated();

        $nombres = fn (string $query) => collect($this->getJson('/api/aliados?page=1&' . $query)->assertOk()->json('data'))->pluck('nombre')->sort()->values()->all();

        $this->assertSame(['PEDRO PÉREZ', 'TECNOMARIN S.A.S'], $nombres(''));
        // Búsqueda: por nombre, documento, nombre del técnico o su cédula.
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('search=tecnomarin'));
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('search=900123'));
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('search=LAURA'));
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('search=1111222233'));
        $this->assertSame(['PEDRO PÉREZ'], $nombres('search=1020304050'));
        $this->assertSame([], $nombres('search=nadie'));
        // Tipo.
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('tipo=empresa'));
        $this->assertSame(['PEDRO PÉREZ'], $nombres('tipo=tecnico'));
        // Proyecto.
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('proyecto=' . $this->proyecto['DIRECTV']));
        $this->assertSame(['PEDRO PÉREZ'], $nombres('proyecto=' . $this->proyecto['TIGO HOME']));
        $this->assertSame([], $nombres('proyecto=' . $this->proyecto['TIGO EXPRESS']));
        // Combinados: la búsqueda por técnico no se salta los demás filtros.
        $this->assertSame([], $nombres('search=LAURA&tipo=tecnico'));
        $this->assertSame([], $nombres('search=LAURA&proyecto=' . $this->proyecto['TIGO HOME']));
        $this->assertSame(['TECNOMARIN S.A.S'], $nombres('search=LAURA&tipo=empresa&proyecto=' . $this->proyecto['HUGHES COL']));
    }

    public function test_el_jefe_inmediato_es_obligatorio_y_no_puede_ser_tecnico_ni_rol_general(): void
    {
        $this->actuarComo('admin');
        $general = $this->usuario('general', ['name' => 'USUARIO GENERAL'])->id;
        $inactivo = $this->usuario('operaciones', ['name' => 'JEFE INACTIVO', 'activo' => false])->id;

        // Opciones: usuarios activos, sin técnicos ni rol general.
        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona())->assertCreated();
        $tecnico = User::where('cedula', '1020304050')->value('id');
        $opciones = collect($this->getJson('/api/aliados/jefes')->assertOk()->json())->pluck('id');
        $this->assertContains($this->jefe, $opciones);
        foreach ([$general, $inactivo, $tecnico] as $id) {
            $this->assertNotContains($id, $opciones);
        }

        $this->postJson('/api/aliados', $this->empresa(['jefe_inmediato_id' => null]))->assertJsonValidationErrors('jefe_inmediato_id');
        foreach ([$general, $inactivo, $tecnico] as $id) {
            $this->postJson('/api/aliados', $this->empresa(['jefe_inmediato_id' => $id]))->assertJsonValidationErrors('jefe_inmediato_id');
            $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona(['cedula' => '5556667778', 'jefe_inmediato_id' => $id]))
                ->assertJsonValidationErrors('jefe_inmediato_id');
        }

        // Se guarda, se muestra en la lista y en la ficha, y se cambia al editar.
        $id = $this->postJson('/api/aliados', $this->empresa())->assertCreated()
            ->assertJsonPath('aliado.jefe_inmediato.name', 'COORDINADOR OPERACIONES')->json('aliado.id');
        $this->getJson("/api/aliados/{$id}")->assertJsonPath('jefe_inmediato.name', 'COORDINADOR OPERACIONES');
        $this->assertSame('COORDINADOR OPERACIONES', collect($this->getJson('/api/aliados?page=1')->json('data'))->firstWhere('id', $id)['jefe_inmediato']['name']);

        $otro = $this->usuario('th', ['name' => 'OTRO JEFE'])->id;
        $this->putJson("/api/aliados/{$id}", $this->empresa(['jefe_inmediato_id' => $otro]))->assertOk()
            ->assertJsonPath('jefe_inmediato.name', 'OTRO JEFE');
    }

    private function encenderAvanza(): void
    {
        config([
            'sso.crear_usuarios_en_avanza' => true,
            'sso.avanzaconoce_api_url'     => 'https://avanza.test/',
            'sso.secret'                   => 'secreto-compartido',
        ]);
    }

    public function test_el_aliado_indirecto_se_crea_en_avanzaconoce_como_el_tecnico_directo(): void
    {
        $this->actuarComo('admin');
        $this->encenderAvanza();
        Http::fake(['https://avanza.test/api/erp/empleados' => Http::response(['id' => 555, 'ya_existia' => false], 201)]);
        $jefe = User::find($this->jefe);

        $r = $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona([
            'proyectos' => [$this->proyecto['DIRECTV'], $this->proyecto['TIGO HOME']], 'ciudad' => 'Dosquebradas', 'direccion' => 'Calle 1 # 2-3',
        ]))->assertCreated();

        $r->assertJsonPath('credenciales.avanza.estado', 'ok');
        $tecnico = User::where('cedula', '1020304050')->first();
        $this->assertSame(['ok', 555], [$tecnico->avanza_sync_estado, (int) $tecnico->avanzaconoce_id]);
        $this->assertTrue(Hash::check($r->json('credenciales.password'), $tecnico->password));

        Http::assertSentCount(1);
        Http::assertSent(function (Peticion $req) use ($tecnico, $jefe) {
            $d = $req->data();
            // Mismo rol que el técnico directo; empresa/empleador Servimercadeo; indirecto.
            $this->assertEquals([
                'rol_avanza' => 'empleado', 'rol_erp' => 'tecnico', 'proyecto' => 'DIRECTV, TIGO HOME',
                'cedula' => '1020304050', 'password_hash' => $tecnico->password,
                'nombres' => 'PEDRO', 'apellidos' => 'PÉREZ', 'email' => 'pedro.perez@test.co', 'movil' => '3104445566',
                'direccion' => 'Calle 1 # 2-3', 'ciudad' => 'Dosquebradas',
                'empresa' => 'SERVIMERCADEO COL', 'empleador' => 'SERVIMERCADEO', 'tipo_vinculacion' => 'Indirecto',
                'cargo' => 'TÉCNICO DE INSTALACIONES',
                'jefe_inmediato_nombre' => $jefe->name, 'jefe_inmediato_correo' => mb_strtolower($jefe->email),
            ], array_intersect_key($d, array_flip([
                'rol_avanza', 'rol_erp', 'proyecto', 'cedula', 'password_hash', 'nombres', 'apellidos', 'email', 'movil',
                'direccion', 'ciudad', 'empresa', 'empleador', 'tipo_vinculacion', 'cargo', 'jefe_inmediato_nombre', 'jefe_inmediato_correo',
            ])) + []);
            // Lo que no pide el formulario del aliado no se envía (queda vacío allá).
            foreach (['eps', 'arl', 'banco', 'sede', 'fecha_ingreso', 'ingresos'] as $campo) {
                $this->assertArrayNotHasKey($campo, $d);
            }
            return $req->hasHeader('X-ERP-Secret', 'secreto-compartido');
        });
    }

    public function test_si_avanzaconoce_falla_el_aliado_queda_creado_y_se_reintenta(): void
    {
        $this->actuarComo('admin');
        $this->encenderAvanza();
        // Primero AvanzaConoce falla; en el reintento responde bien.
        Http::fake(['*' => Http::sequence()->push('caído', 500)->push(['id' => 556], 201)]);

        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona())->assertCreated()
            ->assertJsonPath('credenciales.avanza.estado', 'error');
        $this->assertSame(1, Aliado::count());
        $this->assertSame('error', User::where('cedula', '1020304050')->value('avanza_sync_estado'));

        // El reintento usa los datos del aliado (no tiene contrato).
        $this->artisan('avanza:sincronizar-usuarios')->assertSuccessful();
        $this->assertSame('ok', User::where('cedula', '1020304050')->value('avanza_sync_estado'));
        Http::assertSent(fn (Peticion $req) => $req['empresa'] === 'SERVIMERCADEO COL' && $req['rol_erp'] === 'tecnico');
    }

    public function test_el_aliado_empresa_se_crea_en_avanzaconoce_como_aliado_con_su_lider(): void
    {
        $this->actuarComo('admin');
        $this->encenderAvanza();
        Http::fake(['https://avanza.test/api/erp/empleados' => Http::response(['id' => 1196, 'ya_existia' => false], 201)]);
        $jefe = User::find($this->jefe);

        $r = $this->postJson('/api/aliados', $this->empresa([
            'documento' => '901538103-9', 'nombre' => 'SATELITAL CARVAJAL ACEVEDO S.A.S', 'telefono' => '310 409 2647',
            'correo' => 'GladisCarvajalace@gmail.com', 'ciudad' => 'Medellín',
            'proyectos' => [$this->proyecto['HUGHES COL'], $this->proyecto['DIRECTV']],
        ]))->assertCreated();

        // Credenciales de AvanzaConoce (no del ERP) y resultado del envío.
        $r->assertJsonPath('credenciales.email', 'gladiscarvajalace@gmail.com')
            ->assertJsonPath('credenciales.solo_avanza', true)
            ->assertJsonPath('credenciales.avanza.estado', 'ok');
        $aliado = Aliado::firstOrFail();
        $this->assertTrue(Hash::check($r->json('credenciales.password'), $aliado->avanza_password));
        $this->assertSame(['ok', 1196], [$aliado->avanza_sync_estado, (int) $aliado->avanzaconoce_id]);
        $this->assertArrayNotHasKey('avanza_password', $r->json('aliado'));
        // La empresa no es usuario del ERP.
        $this->assertSame(0, User::where('cedula', '9015381039')->count());

        Http::assertSentCount(1);
        Http::assertSent(function (Peticion $req) use ($aliado, $jefe, $r) {
            $this->assertEquals([
                'rol_avanza' => 'aliado', 'rol_erp' => 'aliado', 'proyecto' => 'DIRECTV',
                'cedula' => '9015381039', 'password_hash' => $aliado->avanza_password,
                'nombres' => 'SATELITAL CARVAJAL', 'apellidos' => 'ACEVEDO S.A.S', 'name' => 'SATELITAL CARVAJAL ACEVEDO S.A.S',
                'email' => 'gladiscarvajalace@gmail.com', 'email_contacto' => 'gladiscarvajalace@gmail.com', 'movil' => '3104092647',
                'ciudad' => 'Medellín', 'direccion' => 'Calle 10 # 20-30', 'area_empresa' => 'Comercial',
                'razon_social' => 'SATELITAL CARVAJAL ACEVEDO S.A.S', 'codigo_pvd' => '39582', 'modalidad_id_bt' => 26359,
                'jefe_inmediato_nombre' => $jefe->name, 'jefe_inmediato_correo' => mb_strtolower($jefe->email),
            ], $req->data());
            // Nunca la contraseña en claro.
            $this->assertStringNotContainsString($r->json('credenciales.password'), $req->body());
            return $req->hasHeader('X-ERP-Secret', 'secreto-compartido');
        });

        // Agregarle técnicos después no envía nada más a AvanzaConoce.
        $this->postJson("/api/aliados/{$aliado->id}/tecnicos", $this->persona())->assertCreated()
            ->assertJsonMissingPath('credenciales.avanza');
        Http::assertSentCount(1);
    }

    public function test_aliado_empresa_solo_tigo_va_al_portal_de_su_proyecto(): void
    {
        $this->actuarComo('admin');
        $this->encenderAvanza();
        Http::fake(['*' => Http::response(['id' => 9], 201)]);

        $this->postJson('/api/aliados', $this->empresa(['proyectos' => [$this->proyecto['TIGO HOME'], $this->proyecto['TIGO EXPRESS']]]))->assertCreated();
        Http::assertSent(fn (Peticion $req) => $req['proyecto'] === 'TIGO EXPRESS');
    }

    public function test_aliado_empresa_si_avanzaconoce_falla_o_rechaza_se_reintenta(): void
    {
        $this->actuarComo('admin');
        $this->encenderAvanza();
        Http::fake(['*' => Http::sequence()
            ->push('caído', 500)
            ->push(['message' => 'El correo contacto@tecnomarin.co ya pertenece a otra persona en AvanzaConoce.'], 409)
            ->push(['id' => 77], 201)]);

        // 1) AvanzaConoce caído: el aliado queda creado y en 'error'.
        $r = $this->postJson('/api/aliados', $this->empresa())->assertCreated()->assertJsonPath('credenciales.avanza.estado', 'error');
        $aliado = Aliado::firstOrFail();
        $this->assertSame('error', $aliado->avanza_sync_estado);
        $hash = $aliado->avanza_password;

        // 2) El reintento llega, pero el correo es de otra persona: conflicto (no se reintenta).
        $this->artisan('avanza:sincronizar-usuarios')->assertSuccessful();
        $this->assertSame('conflicto', $aliado->fresh()->avanza_sync_estado);
        $this->assertStringContainsString('ya pertenece a otra persona', $aliado->fresh()->avanza_sync_error);
        $this->artisan('avanza:sincronizar-usuarios')->assertSuccessful();
        Http::assertSentCount(2);

        // 3) Se corrige el correo en el ERP: vuelve a pendiente y el reintento lo crea, con la misma contraseña.
        $this->putJson("/api/aliados/{$aliado->id}", $this->empresa(['correo' => 'otro@tecnomarin.co']))->assertOk();
        $this->assertSame('pendiente', $aliado->fresh()->avanza_sync_estado);
        $this->artisan('avanza:sincronizar-usuarios')->assertSuccessful();
        $this->assertSame(['ok', 77], [$aliado->fresh()->avanza_sync_estado, (int) $aliado->fresh()->avanzaconoce_id]);
        Http::assertSent(fn (Peticion $req) => $req['email'] === 'otro@tecnomarin.co' && $req['password_hash'] === $hash);
        $this->assertTrue(Hash::check($r->json('credenciales.password'), $hash));
    }

    public function test_razon_social_se_reparte_en_nombre_y_apellido(): void
    {
        $partir = fn (string $r) => \App\Services\AltaAliadoEnAvanzaConoce::partirRazonSocial($r);
        $this->assertSame(['SATELITAL CARVAJAL', 'ACEVEDO S.A.S'], $partir('SATELITAL CARVAJAL ACEVEDO S.A.S'));
        $this->assertSame(['TECNOMARIN', 'S.A.S'], $partir('TECNOMARIN  S.A.S'));
        $this->assertSame(['AP TELECOMUNICACIONES', 'SATELITALES S.A.S'], $partir('AP TELECOMUNICACIONES SATELITALES S.A.S'));
        $this->assertSame(['UNIPERSONAL', 'UNIPERSONAL'], $partir('UNIPERSONAL'));
    }

    public function test_los_proyectos_salen_de_parametros_sin_administrativo_y_un_renombre_se_refleja(): void
    {
        $this->actuarComo('admin');
        Proyecto::firstOrCreate(['nombre' => 'PROYECTO INACTIVO'], ['activo' => false]);

        $opciones = collect($this->getJson('/api/aliados/proyectos')->assertOk()->json())->pluck('nombre');
        $this->assertTrue($opciones->contains('HUGHES COL') && $opciones->contains('TIGO HOME'));
        $this->assertFalse($opciones->contains('ADMINISTRATIVO'));
        $this->assertFalse($opciones->contains('PROYECTO INACTIVO'));

        $id = $this->postJson('/api/aliados', $this->empresa())->assertCreated()->json('aliado.id');

        // Si en Parámetros se renombra el proyecto, el aliado lo muestra con el nombre nuevo.
        Proyecto::whereKey($this->proyecto['HUGHES COL'])->update(['nombre' => 'HUGHES COLOMBIA']);
        $this->assertSame(['DIRECTV', 'HUGHES COLOMBIA'], $this->nombresProyectos($this->getJson("/api/aliados/{$id}"), 'proyectos'));
    }

    public function test_editar_cambia_los_proyectos(): void
    {
        $this->actuarComo('admin');
        $id = $this->postJson('/api/aliados', $this->empresa())->assertCreated()->json('aliado.id');

        $r = $this->putJson("/api/aliados/{$id}", $this->empresa(['proyectos' => [$this->proyecto['TIGO EXPRESS']]]))->assertOk();
        $this->assertSame(['TIGO EXPRESS'], $this->nombresProyectos($r, 'proyectos'));
    }

    public function test_el_proyecto_es_obligatorio_y_debe_ser_valido(): void
    {
        $this->actuarComo('admin');

        $this->postJson('/api/aliados', $this->empresa(['proyectos' => []]))->assertStatus(422)->assertJsonValidationErrors('proyectos');
        $this->postJson('/api/aliados', $this->empresa(['proyectos' => [999999]]))->assertStatus(422)->assertJsonValidationErrors('proyectos.0');
        // ADMINISTRATIVO no se le asigna a un aliado.
        $this->postJson('/api/aliados', $this->empresa(['proyectos' => [$this->proyecto['ADMINISTRATIVO']]]))->assertStatus(422)->assertJsonValidationErrors('proyectos.0');
        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona(['proyectos' => null]))->assertStatus(422)->assertJsonValidationErrors('proyectos');
        $this->postJson('/api/aliados', $this->empresa(['tipo_documento' => 'PASAPORTE']))->assertStatus(422)->assertJsonValidationErrors('tipo_documento');
        $this->assertSame(0, Aliado::count());
    }

    public function test_aliado_indirecto_con_nit_queda_con_su_cedula_en_el_usuario_tecnico(): void
    {
        $this->actuarComo('admin');

        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona(['tipo_documento' => 'NIT', 'cedula' => '1020304050-3']))
            ->assertCreated()->assertJsonPath('aliado.documento', '1020304050-3');

        $this->assertSame('1020304050', User::where('aliado_id', Aliado::value('id'))->value('cedula'));

        // Con cédula (CC o CE) no se acepta el guion del dígito de verificación.
        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona(['cedula' => '555666777-1', 'email' => 'otro@test.co', 'movil' => '3201234567']))
            ->assertStatus(422)->assertJsonValidationErrors('cedula');
    }

    public function test_todos_los_campos_menos_observaciones_son_obligatorios_con_mensajes_en_espanol(): void
    {
        $this->actuarComo('admin');
        $proyectos = 'Selecciona al menos un proyecto para el que trabaja el aliado (ej. DIRECTV o HUGHES COL).';

        // Empresa vacía: un mensaje claro por campo.
        $errores = $this->postJson('/api/aliados', ['tipo' => 'empresa'])->assertStatus(422)->json('errors');
        $this->assertSame([
            'tipo_documento'    => 'Completa el campo «Tipo de documento».',
            'documento'         => 'Completa el campo «Número de documento».',
            'nombre'            => 'Completa el campo «Razón social o nombre».',
            'codigo_pdv'        => 'Completa el campo «Código punto de venta (PDV)».',
            'modalidad_id_bt'   => 'Selecciona la modalidad del aliado.',
            'telefono'          => 'Completa el campo «Teléfono».',
            'correo'            => 'Completa el campo «Correo».',
            'ciudad'            => 'Completa el campo «Ciudad».',
            'direccion'         => 'Completa el campo «Dirección».',
            'proyectos'         => $proyectos,
            'jefe_inmediato_id' => 'Selecciona el jefe inmediato del aliado.',
        ], collect($errores)->map(fn ($m) => $m[0])->all());

        // Aliado / técnico indirecto vacío.
        $errores = $this->postJson('/api/aliados', ['tipo' => 'tecnico'])->assertStatus(422)->json('errors');
        $this->assertEqualsCanonicalizing(
            ['tipo_documento', 'cedula', 'nombres', 'apellidos', 'movil', 'email', 'ciudad', 'direccion', 'proyectos', 'jefe_inmediato_id'],
            array_keys($errores)
        );
        $this->assertSame('Completa el campo «Número de documento».', $errores['cedula'][0]);
        $this->assertSame('Completa el campo «Correo».', $errores['email'][0]);
        $this->assertSame($proyectos, $errores['proyectos'][0]);
        $this->assertArrayNotHasKey('observaciones', $errores);

        // Espacios en blanco cuentan como vacío.
        $this->postJson('/api/aliados', $this->empresa(['nombre' => '   ', 'correo' => ' ']))
            ->assertJsonValidationErrors(['nombre', 'correo']);

        // Formatos.
        $formato = fn (array $extra, string $campo) => $this->postJson('/api/aliados', $this->empresa($extra))->assertStatus(422)->json("errors.{$campo}.0");
        $this->assertSame('El correo «pedro@» no es válido. Escríbelo completo, ej. nombre@empresa.com.', $formato(['correo' => 'pedro@'], 'correo'));
        $this->assertSame('El teléfono debe tener solo números, ej. 3001234567 o 6041234567.', $formato(['telefono' => 'abc123'], 'telefono'));
        $this->assertStringContainsString('solo números', $formato(['documento' => '90.012.345'], 'documento'));

        $persona = fn (array $extra, string $campo) => $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona($extra))->assertStatus(422)->json("errors.{$campo}.0");
        $this->assertSame('Los nombres solo pueden tener letras y espacios.', $persona(['nombres' => 'Pedro2'], 'nombres'));
        $this->assertSame('El celular debe tener solo números, ej. 3001234567.', $persona(['movil' => 'tres cero'], 'movil'));
        $this->assertStringContainsString('solo números', $persona(['cedula' => '12ab'], 'cedula'));
        $this->assertStringContainsString('solo aplica al NIT', $persona(['cedula' => '1020304050-3'], 'cedula'));

        // Los nombres con tildes, ñ y el teléfono con espacios sí pasan.
        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona(['nombres' => 'José Ñañez', 'apellidos' => "D'Alemán-Ríos", 'movil' => '+57 310 444 5566']))
            ->assertCreated();
        $this->assertSame(1, Aliado::count());
    }

    public function test_aliado_empresa_guarda_pdv_y_modalidad_del_catalogo_de_avanzaconoce(): void
    {
        $this->actuarComo('admin');

        $this->assertSame(
            [['id_bt' => 26359, 'nombre' => 'ALIADO TIPO A'], ['id_bt' => 26313, 'nombre' => 'SUBAGENTE'], ['id_bt' => 59838, 'nombre' => 'ALIADO TIPO B']],
            $this->getJson('/api/aliados/modalidades')->assertOk()->json()
        );

        $id = $this->postJson('/api/aliados', $this->empresa())->assertCreated()
            ->assertJsonPath('aliado.codigo_pdv', '39582')->assertJsonPath('aliado.modalidad_id_bt', 26359)->json('aliado.id');
        $this->putJson("/api/aliados/{$id}", $this->empresa(['codigo_pdv' => '1200', 'modalidad_id_bt' => 59838]))->assertOk();
        $this->getJson("/api/aliados/{$id}")->assertJsonPath('codigo_pdv', '1200')->assertJsonPath('modalidad_id_bt', 59838);

        $error = fn (array $extra, string $campo) => $this->postJson('/api/aliados', $this->empresa(['documento' => '800111222'] + $extra))->assertStatus(422)->json("errors.{$campo}.0");
        $this->assertSame('El código punto de venta (PDV) debe tener solo números, ej. 39582.', $error(['codigo_pdv' => 'PDV-12'], 'codigo_pdv'));
        $this->assertStringContainsString('no está en el catálogo', $error(['modalidad_id_bt' => 99999], 'modalidad_id_bt'));
        $this->putJson("/api/aliados/{$id}", $this->empresa(['codigo_pdv' => '', 'modalidad_id_bt' => '']))
            ->assertJsonValidationErrors(['codigo_pdv', 'modalidad_id_bt']);

        // El aliado indirecto (una persona) no los lleva.
        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona())->assertCreated()
            ->assertJsonPath('aliado.codigo_pdv', null)->assertJsonPath('aliado.modalidad_id_bt', null);
    }

    public function test_al_editar_tambien_son_obligatorios_proyectos_jefe_y_demas_campos(): void
    {
        $this->actuarComo('admin');
        $empresa = $this->postJson('/api/aliados', $this->empresa())->assertCreated()->json('aliado.id');
        $indirecto = $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona())->assertCreated()->json('aliado');

        $this->putJson("/api/aliados/{$empresa}", $this->empresa(['proyectos' => [], 'jefe_inmediato_id' => null, 'correo' => '', 'direccion' => '']))
            ->assertStatus(422)
            ->assertJsonPath('errors.proyectos.0', 'Selecciona al menos un proyecto para el que trabaja el aliado (ej. DIRECTV o HUGHES COL).')
            ->assertJsonPath('errors.jefe_inmediato_id.0', 'Selecciona el jefe inmediato del aliado.')
            ->assertJsonPath('errors.correo.0', 'Completa el campo «Correo».')
            ->assertJsonPath('errors.direccion.0', 'Completa el campo «Dirección».');

        // El aliado indirecto: sin documento, PDV ni modalidad en la edición.
        $datos = ['nombre' => $indirecto['nombre'], 'telefono' => '3104445566', 'correo' => 'pedro.perez@test.co', 'ciudad' => 'PEREIRA',
            'direccion' => 'Carrera 5 # 1-2', 'proyectos' => [$this->proyecto['DIRECTV']], 'jefe_inmediato_id' => $this->jefe];
        $this->putJson("/api/aliados/{$indirecto['id']}", $datos)->assertOk();
        $this->putJson("/api/aliados/{$indirecto['id']}", ['proyectos' => []] + $datos)->assertJsonValidationErrors('proyectos');

        // Técnico de la empresa: también todo obligatorio, correo incluido.
        $errores = $this->postJson("/api/aliados/{$empresa}/tecnicos", [])->assertStatus(422)->json('errors');
        $this->assertEqualsCanonicalizing(['cedula', 'nombres', 'apellidos', 'movil', 'email'], array_keys($errores));
        $this->assertSame('Completa el campo «Cédula».', $errores['cedula'][0]);
    }

    public function test_a_la_empresa_se_le_agregan_tecnicos_despues_y_al_tipo_tecnico_no(): void
    {
        $this->actuarComo('admin');
        $empresa = Aliado::create($this->empresa());
        $tecnicoAliado = Aliado::create(['tipo' => 'tecnico', 'tipo_documento' => 'CC', 'documento' => '777', 'nombre' => 'SOLO']);

        $this->postJson("/api/aliados/{$empresa->id}/tecnicos", $this->persona())->assertCreated();
        $this->postJson("/api/aliados/{$empresa->id}/tecnicos", $this->persona(['cedula' => '5556667778', 'movil' => '3157778899', 'email' => 'simon@test.co']))->assertCreated();
        $this->assertSame(2, $empresa->tecnicos()->count());

        $this->postJson("/api/aliados/{$tecnicoAliado->id}/tecnicos", $this->persona(['cedula' => '999888777', 'movil' => '3201112222', 'email' => 'otro@test.co']))
            ->assertStatus(422);
    }

    public function test_no_reutiliza_la_cedula_de_un_empleado_y_no_deja_el_aliado_a_medias(): void
    {
        $this->actuarComo('admin');
        $this->usuario('general', ['cedula' => '1020304050', 'email' => 'empleado@test.co']);

        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona())
            ->assertStatus(422)->assertJsonValidationErrors('cedula');

        $this->assertSame(0, Aliado::count());
        $this->assertNull(User::where('cedula', '1020304050')->value('aliado_id'));
    }

    public function test_documento_de_aliado_repetido_se_rechaza(): void
    {
        $this->actuarComo('admin');
        Aliado::create($this->empresa());

        $this->postJson('/api/aliados', $this->empresa(['nombre' => 'OTRA']))
            ->assertStatus(422)->assertJsonValidationErrors('documento');
    }

    public function test_cuenta_las_work_orders_de_sus_tecnicos_por_estado_sin_duplicar_items(): void
    {
        $this->actuarComo('admin');
        $empresa = Aliado::create($this->empresa());
        $this->postJson("/api/aliados/{$empresa->id}/tecnicos", $this->persona())->assertCreated();

        // WO1 trae dos ítems: cuenta una vez.
        WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '1', 'estado' => 'Finalizado', 'cedula_tecnico' => '1020304050']);
        WorkOrder::create(['numero_wo' => 'WO1', 'numero_item' => '2', 'estado' => 'Finalizado', 'cedula_tecnico' => '1020304050']);
        WorkOrder::create(['numero_wo' => 'WO2', 'numero_item' => '', 'estado' => 'Atendido', 'cedula_tecnico' => '1020304050']);
        WorkOrder::create(['numero_wo' => 'WO3', 'numero_item' => '', 'estado' => 'Finalizado', 'cedula_tecnico' => '4444444']);

        $this->getJson('/api/aliados')->assertOk()
            ->assertJsonPath('0.work_orders', ['asignadas' => 2, 'atendidas' => 1, 'finalizadas' => 1])
            ->assertJsonPath('0.tecnicos_count', 1);

        $this->getJson("/api/aliados/{$empresa->id}")->assertOk()
            ->assertJsonPath('tecnicos.0.work_orders.asignadas', 2);

        $this->assertCount(3, $this->getJson("/api/aliados/{$empresa->id}/work-orders")->json());
        $this->assertSame(['WO2'], collect($this->getJson("/api/aliados/{$empresa->id}/work-orders?estado=atendidas")->json())->pluck('numero_wo')->all());
    }

    public function test_los_tecnicos_de_aliados_no_aparecen_en_empleados(): void
    {
        $this->actuarComo('admin');
        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona())->assertCreated();
        $this->usuario('general', ['cedula' => '8887776665', 'pendiente_alta' => false]);

        $respuesta = $this->getJson('/api/empleados')->assertOk()->json();
        $cedulas = collect($respuesta['data'] ?? $respuesta)->pluck('cedula');
        $this->assertContains('8887776665', $cedulas);
        $this->assertNotContains('1020304050', $cedulas);
    }

    public function test_un_aliado_con_tecnicos_no_se_elimina(): void
    {
        $this->actuarComo('admin');
        $this->postJson('/api/aliados', ['tipo' => 'tecnico'] + $this->persona())->assertCreated();
        $vacio = Aliado::create($this->empresa());

        $this->deleteJson('/api/aliados/' . Aliado::where('tipo', 'tecnico')->value('id'))->assertStatus(422);
        $this->deleteJson("/api/aliados/{$vacio->id}")->assertOk();
    }

    public function test_el_rol_tecnico_no_administra_aliados(): void
    {
        $this->actuarComo('tecnico', ['cedula' => '123123123']);

        $this->postJson('/api/aliados', $this->empresa())->assertForbidden();
        $this->assertSame(0, Aliado::count());
    }

    public function test_editar_tecnico_e_inactivarlo(): void
    {
        $this->actuarComo('admin');
        $empresa = Aliado::create($this->empresa());
        $this->postJson("/api/aliados/{$empresa->id}/tecnicos", $this->persona())->assertCreated();
        $tecnico = User::where('cedula', '1020304050')->firstOrFail();

        $this->putJson("/api/aliados/{$empresa->id}/tecnicos/{$tecnico->id}", [
            'nombres' => 'Pedro José', 'apellidos' => 'Pérez', 'movil' => '3104445566', 'email' => 'pedro.perez@test.co', 'activo' => false,
        ])->assertOk();

        $this->assertSame(['PEDRO JOSÉ PÉREZ', false], [$tecnico->fresh()->name, $tecnico->fresh()->activo]);
    }
}
