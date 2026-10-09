<?php

namespace Tests\Feature\Contratos;

use App\Models\Contrato;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Importar Excel de Empleados (rellenar datos personales) y el rellenado de contratos existentes
 * que usa Importar Excel de Contratos.
 * Ambos solo rellenan campos vacíos, nunca sobrescriben, y una celda inválida se reporta
 * sin tumbar el resto del lote.
 */
class ImportacionExcelTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake();
        $this->actuarComo('th');
    }

    private function importarEmpleados(array $filas)
    {
        return $this->postJson('/api/empleados/importar-datos-personales', ['filas' => $filas]);
    }

    private function completarContratos(array $filas)
    {
        return $this->postJson('/api/contratos/importar-datos-faltantes', ['filas' => $filas]);
    }

    private function detalle($respuesta, string $clave, string $valor): array
    {
        return collect($respuesta->json('detalle'))->firstWhere($clave, $valor);
    }

    /** Empleado con contrato vigente: el único caso que acepta Importar Excel de Empleados. */
    private function empleadoConContrato(array $atributos): User
    {
        $user = $this->usuario('general', $atributos);
        $this->contrato($user);

        return $user;
    }

    // ── Empleados ────────────────────────────────────────────────────────────

    public function test_empleados_solo_acepta_cedulas_con_contrato_vigente(): void
    {
        $this->usuario('general', ['cedula' => '5010', 'barrio' => null]);
        $anulado = $this->usuario('general', ['cedula' => '5011', 'barrio' => null]);
        $this->contrato($anulado, ['completado' => false]);

        $r = $this->importarEmpleados([['cedula' => '5010', 'barrio' => 'X'], ['cedula' => '5011', 'barrio' => 'X']])->assertOk();

        $this->assertSame(['5010', '5011'], $r->json('sin_contrato'));
        $this->assertSame([], $r->json('detalle'));
        $this->assertNull(User::where('cedula', '5010')->value('barrio'));
    }

    public function test_crear_contrato_para_cedula_nueva_deja_al_empleado_pendiente_y_sin_acceso(): void
    {
        $this->usuario('general', ['email' => 'ocupado@empresa.co']);

        $this->postJson('/api/contratos', [
            'documento' => '5020', 'nombres' => 'luz', 'apellidos' => 'mora', 'correo' => 'ocupado@empresa.co',
            'cargo' => 'ASESOR', 'fecha_ingreso' => '2026-09-01', 'estado_contrato' => 'Activo',
        ])->assertCreated();

        $user = User::where('cedula', '5020')->first();
        $this->assertTrue((bool) $user->pendiente_alta);
        $this->assertSame('5020@avanzaconoce.com', $user->email, 'Correo de otra persona: se usa el autogenerado.');
        $this->assertFalse(Hash::check('5020', $user->password), 'La cédula nunca es la contraseña.');

        // Pendiente de alta: no puede iniciar sesión ni conociendo la contraseña
        $user->forceFill(['password' => Hash::make('Clave123')])->saveQuietly();
        $this->app["auth"]->forgetGuards();
        $this->app["auth"]->shouldUse("web");
        $this->postJson('/login', ['email' => '5020@avanzaconoce.com', 'password' => 'Clave123'])->assertStatus(422);

        // Después del alta en Empleados sí puede
        $this->actuarComo('th');
        $r = $this->importarEmpleados([['cedula' => '5020', 'barrio' => 'CENTRO', 'movil' => '3001110020']])->assertOk()->assertJsonPath('dados_de_alta', 1);
        $clave = $this->detalle($r, 'cedula', '5020')['credenciales']['password'];
        $this->app["auth"]->forgetGuards();
        $this->app["auth"]->shouldUse("web");
        $this->postJson('/login', ['email' => '5020@avanzaconoce.com', 'password' => $clave])->assertOk();
    }

    public function test_dar_de_alta_un_empleado_creado_desde_contratos_no_tumba_la_importacion(): void
    {
        // Igual que lo crea "Importar Excel" de Contratos: queda pendiente de alta con rol "general".
        $this->postJson('/api/contratos', [
            'documento' => '5001', 'nombres' => 'ana', 'apellidos' => 'perez', 'cargo' => 'ASESOR',
            'tipo_contrato' => 'Indefinido', 'fecha_ingreso' => '2026-09-01', 'estado_contrato' => 'Activo',
        ])->assertCreated();
        $user = User::where('cedula', '5001')->first();
        $user->forceFill(['pendiente_alta' => true])->saveQuietly();
        $this->assertSame('general', $user->fresh()->rol);

        $r = $this->importarEmpleados([['cedula' => '5001', 'barrio' => 'CENTRO', 'movil' => '3001110001']])->assertOk();

        $r->assertJsonPath('dados_de_alta', 1)->assertJsonPath('actualizados', 1);
        $user = $user->fresh();
        $this->assertSame('general', $user->rol);
        $this->assertFalse((bool) $user->pendiente_alta);
        $this->assertSame('CENTRO', $user->barrio);
        $this->assertTrue(Hash::check($this->detalle($r, 'cedula', '5001')['credenciales']['password'], $user->password));
    }

    public function test_solo_rellena_campos_vacios_y_reporta_los_omitidos(): void
    {
        $this->empleadoConContrato(['cedula' => '5002', 'barrio' => 'EL POBLADO', 'rh' => null]);

        $r = $this->importarEmpleados([['cedula' => '5002', 'barrio' => 'OTRO', 'rh' => 'O+']])->assertOk();

        $fila = $this->detalle($r, 'cedula', '5002');
        $this->assertSame(['rh'], $fila['campos_actualizados']);
        $this->assertSame(['barrio'], $fila['campos_omitidos']);
        $user = User::where('cedula', '5002')->first();
        $this->assertSame('EL POBLADO', $user->barrio);
        $this->assertSame('O+', $user->rh);
    }

    public function test_una_fecha_imposible_se_reporta_y_no_tumba_el_lote(): void
    {
        $this->empleadoConContrato(['cedula' => '5003', 'fecha_nacimiento' => null, 'barrio' => null]);
        $this->empleadoConContrato(['cedula' => '5004', 'barrio' => null]);

        $r = $this->importarEmpleados([
            ['cedula' => '5003', 'fecha_nacimiento' => '1990-02-31', 'barrio' => 'LAURELES'],
            ['cedula' => '5004', 'barrio' => 'BELEN'],
        ])->assertOk();

        $this->assertSame(['fecha_nacimiento'], $this->detalle($r, 'cedula', '5003')['campos_invalidos']);
        $this->assertNull(User::where('cedula', '5003')->value('fecha_nacimiento'));
        $this->assertSame('LAURELES', User::where('cedula', '5003')->value('barrio'));
        $this->assertSame('BELEN', User::where('cedula', '5004')->value('barrio'));
    }

    public function test_los_valores_de_relleno_del_alta_automatica_cuentan_como_vacios(): void
    {
        $this->empleadoConContrato(['cedula' => '5005', 'movil' => '0000000000', 'eps' => 'Sin asignar', 'arl' => 'SIN ASIGNAR']);

        $r = $this->importarEmpleados([['cedula' => '5005', 'movil' => '3001234567', 'eps' => 'nueva eps', 'arl' => 'sura']])->assertOk();

        $this->assertEqualsCanonicalizing(['movil', 'eps', 'arl'], $this->detalle($r, 'cedula', '5005')['campos_actualizados']);
        $user = User::where('cedula', '5005')->first();
        $this->assertSame('3001234567', $user->movil);
        // Mismo formato que el formulario (EmpleadoController::normalizarNombres)
        $this->assertSame('NUEVA EPS', $user->eps);
        $this->assertSame('SURA', $user->arl);
    }

    public function test_valida_sede_genero_y_correo_del_jefe(): void
    {
        $this->sede('SYM PEREIRA');
        $this->empleadoConContrato(['cedula' => '5006', 'sede' => null, 'genero' => 'No especificado', 'jefe_inmediato_correo' => null]);
        $this->empleadoConContrato(['cedula' => '5007', 'sede' => null, 'genero' => 'No especificado', 'jefe_inmediato_correo' => null]);

        $r = $this->importarEmpleados([
            ['cedula' => '5006', 'sede' => 'sym pereira', 'genero' => 'F', 'jefe_inmediato_correo' => 'jefe@empresa.co'],
            ['cedula' => '5007', 'sede' => 'SEDE INEXISTENTE', 'genero' => 'XYZ', 'jefe_inmediato_correo' => 'no-es-correo'],
        ])->assertOk();

        $ok = User::where('cedula', '5006')->first();
        $this->assertSame('SYM PEREIRA', $ok->sede, 'Se guarda con el nombre oficial del catálogo.');
        $this->assertNotNull($ok->sede_id);
        $this->assertSame('Femenino', $ok->genero);
        $this->assertSame('jefe@empresa.co', $ok->jefe_inmediato_correo);

        $this->assertEqualsCanonicalizing(['sede', 'genero', 'jefe_inmediato_correo'], $this->detalle($r, 'cedula', '5007')['campos_invalidos']);
        $this->assertSame('No especificado', User::where('cedula', '5007')->value('genero'));
    }

    public function test_cedula_inexistente_se_reporta_y_no_crea_nada(): void
    {
        $antes = User::count();

        $this->importarEmpleados([['cedula' => '999999', 'barrio' => 'X']])
            ->assertOk()->assertJsonPath('no_encontrados', ['999999']);

        $this->assertSame($antes, User::count());
    }

    public function test_solo_th_tic_y_admin_pueden_importar(): void
    {
        $this->actuarComo('general');
        $this->importarEmpleados([['cedula' => '1', 'barrio' => 'X']])->assertForbidden();
        $this->completarContratos([['documento' => '1', 'arl' => 'X']])->assertForbidden();
    }

    // ── Contratos ────────────────────────────────────────────────────────────

    private function contrato(User $empleado, array $atributos = []): Contrato
    {
        return Contrato::create(array_merge([
            'empleado_id' => $empleado->id, 'cargo' => 'ASESOR', 'fecha_ingreso' => '2026-01-01',
            'estado_contrato' => 'Activo', 'completado' => true,
        ], $atributos));
    }

    public function test_completar_contratos_rellena_el_contrato_vigente_mas_reciente_sin_sobrescribir(): void
    {
        $empleado = $this->usuario('general', ['cedula' => '6001']);
        $viejo = $this->contrato($empleado, ['fecha_ingreso' => '2020-01-01']);
        $vigente = $this->contrato($empleado, ['fecha_ingreso' => '2025-01-01', 'arl' => 'POSITIVA']);
        // Un contrato anulado (completado = false) no se ve en la lista: no debe ser el destino.
        $anulado = $this->contrato($empleado, ['fecha_ingreso' => '2026-05-01', 'completado' => false]);

        $r = $this->completarContratos([['documento' => '6001', 'arl' => 'SURA', 'fondo_cesantias' => 'PROTECCION']])->assertOk();

        $fila = $this->detalle($r, 'documento', '6001');
        $this->assertSame(['fondo_cesantias'], $fila['campos_actualizados']);
        $this->assertSame(['arl'], $fila['campos_omitidos']);
        $this->assertSame('POSITIVA', $vigente->fresh()->arl);
        $this->assertSame('PROTECCION', $vigente->fresh()->fondo_cesantias);
        $this->assertNull($viejo->fresh()->fondo_cesantias);
        $this->assertNull($anulado->fresh()->fondo_cesantias);
    }

    public function test_completar_contratos_valida_fechas_correo_y_regla_empresa_proyecto(): void
    {
        $empleado = $this->usuario('general', ['cedula' => '6002']);
        $contrato = $this->contrato($empleado, ['empresa' => 'SERVIMERCADEO COL']);
        $otro = $this->contrato($this->usuario('general', ['cedula' => '6003']));

        $r = $this->completarContratos([
            ['documento' => '6002', 'fecha_vinculacion_arl' => '2025-02-30', 'jefe_inmediato_correo' => 'malo',
                'cliente_proyecto' => 'TIGO HOME', 'area_empresa' => 'COMERCIAL'],
            ['documento' => '6003', 'fecha_vinculacion_arl' => '2025-02-28'],
        ])->assertOk();

        $this->assertEqualsCanonicalizing(
            ['fecha_vinculacion_arl', 'jefe_inmediato_correo', 'cliente_proyecto'],
            $this->detalle($r, 'documento', '6002')['campos_invalidos'],
        );
        $contrato = $contrato->fresh();
        $this->assertNull($contrato->cliente_proyecto);
        $this->assertSame('COMERCIAL', $contrato->area_empresa);
        $this->assertSame('2025-02-28', $otro->fresh()->fecha_vinculacion_arl->format('Y-m-d'));
    }

    public function test_crear_contrato_guarda_el_correo_del_jefe_y_lo_valida(): void
    {
        $empleado = $this->usuario('general', ['cedula' => '6005']);
        $base = ['empleado_id' => $empleado->id, 'cargo' => 'ASESOR', 'fecha_ingreso' => '2026-01-01', 'estado_contrato' => 'Activo'];

        $this->postJson('/api/contratos', $base + ['jefe_inmediato_correo' => 'no-es-correo'])
            ->assertStatus(422)->assertJsonValidationErrors('jefe_inmediato_correo');

        $id = $this->postJson('/api/contratos', $base + ['jefe_inmediato_correo' => 'jefe@empresa.co'])->assertCreated()->json('id');
        $this->assertSame('jefe@empresa.co', Contrato::find($id)->jefe_inmediato_correo);
    }

    public function test_si_el_contrato_falla_no_queda_un_empleado_huerfano(): void
    {
        // Proyecto inválido para la empresa: el contrato se rechaza después de crear al usuario
        $this->postJson('/api/contratos', [
            'documento' => '6006', 'nombres' => 'ana', 'apellidos' => 'ruiz', 'cargo' => 'ASESOR',
            'empresa' => 'SERVIMERCADEO COL', 'cliente_proyecto' => 'TIGO HOME',
        ])->assertStatus(422);

        $this->assertFalse(User::where('cedula', '6006')->exists());
    }

    public function test_completar_contratos_documento_sin_contrato_se_reporta(): void
    {
        $this->usuario('general', ['cedula' => '6004']);

        $this->completarContratos([['documento' => '6004', 'arl' => 'SURA'], ['documento' => '000', 'arl' => 'SURA']])
            ->assertOk()->assertJsonPath('no_encontrados', ['6004', '000']);
    }
}
