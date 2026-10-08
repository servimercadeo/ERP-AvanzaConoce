<?php

namespace Tests\Feature\Seleccion;

use App\Mail\AvalContratacionMail;
use App\Models\BaseIngreso;
use App\Models\Candidato;
use App\Models\Contrato;
use App\Models\Requisicion;
use App\Models\RespuestaIngreso;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * El empleador se elige al dar el aval (Candidatos) y de ahí lo toman las demás pantallas:
 * Avales, Base de ingreso, Nuevo contrato, Empleados y el correo del aval. El empleador que
 * traían las requisiciones antiguas solo es respaldo.
 */
class EmpleadorDelAvalTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private function empleador(string $nombre, string $tipo): int
    {
        // empleadores.id no es autoincremental: se asigna a mano.
        $id = (int) DB::table('empleadores')->max('id') + 1;
        DB::table('empleadores')->insert(['id' => $id, 'nombre' => $nombre, 'tipo' => $tipo, 'created_at' => now(), 'updated_at' => now()]);

        return $id;
    }

    public function test_el_empleador_del_aval_llega_a_todas_las_pantallas(): void
    {
        $this->actuarComo('admin');
        $job = $this->empleador('JOB AND TALENT', 'Indirecto');
        $staffing = $this->empleador('STAFFING', 'Indirecto');

        // Requisición antigua con otro empleador: manda el del aval.
        $req = Requisicion::create([
            'nro_identificacion_proceso' => $this->unico('PROC'), 'nro_identificacion' => $this->unico('REQ'),
            'fecha_solicitud' => '2026-10-01', 'requeridas' => 1, 'estado' => 'Abierta', 'empleador_id' => $staffing,
        ]);
        $c = Candidato::create([
            'nombres' => 'ANA RUIZ', 'identificacion' => '8001', 'correo' => 'ana@test.co', 'fecha_postulacion' => '2026-10-01',
            'requisicion_id' => $req->id, 'pruebas' => true, 'aval' => true, 'fecha_aval' => '2026-10-02',
            'tipo_vinculacion' => 'Indirecta', 'empleador_id' => $job,
        ]);

        // Candidatos
        $this->getJson('/api/candidatos')->assertOk()->assertJsonFragment(['nombre' => 'JOB AND TALENT']);

        // Correo del aval
        $this->assertStringContainsString('JOB AND TALENT', (new AvalContratacionMail($c->fresh(), null))->render());

        // Avales de contratación (sincronización y listado)
        $this->postJson('/api/base-ingresos/sync')->assertOk();
        $ingreso = BaseIngreso::where('candidato_id', $c->id)->firstOrFail();
        $this->assertSame('JOB AND TALENT', $ingreso->empleador);
        $this->getJson('/api/base-ingresos')->assertOk()->assertJsonPath('0.empleador', 'JOB AND TALENT');

        // Nuevo contrato (indirecto: basta el formulario de ingreso)
        RespuestaIngreso::create([
            'documento' => '8001', 'nombres' => 'Ana', 'apellidos' => 'Ruiz', 'correo' => 'ana@test.co',
            'fecha_nacimiento' => '1990-01-01', 'lugar_nacimiento' => 'Pereira', 'estado_civil' => 'Soltero', 'numero_hijos' => '0',
            'rh' => 'O+', 'nivel_escolaridad' => 'Bachiller', 'profesion' => 'Ninguna', 'ciudad' => 'Pereira', 'barrio' => 'Centro',
            'direccion' => 'Calle 1', 'estrato' => '3', 'celular' => '3001234567', 'emergencia_nombre' => 'X',
            'emergencia_telefono' => '3000000000', 'emergencia_parentesco' => 'Madre', 'eps' => 'SURA', 'afp' => 'PORVENIR',
            'fondo_cesantias' => 'PORVENIR', 'talla_camisa' => 'M', 'talla_pantalon' => '32', 'talla_zapatos' => '38',
        ]);
        $this->getJson('/api/respuestas-ingresos/datos-contrato')->assertOk()
            ->assertJsonPath('0.documento', '8001')->assertJsonPath('0.empleador', 'JOB AND TALENT');

        // Cambiarlo en Avales lo cambia también en el candidato (y en las demás pantallas).
        $this->putJson("/api/base-ingresos/{$ingreso->id}", ['empleador' => 'STAFFING'])->assertOk()
            ->assertJsonPath('empleador', 'STAFFING');
        $this->assertSame($staffing, (int) $c->fresh()->empleador_id);

        // Empleados: sin empleador en el contrato, toma el del aval.
        $empleado = $this->usuario('general', ['cedula' => '8001']);
        Contrato::create(['empleado_id' => $empleado->id, 'cargo' => 'ASESOR', 'estado_contrato' => 'Activo', 'completado' => true]);
        $this->getJson('/api/empleados/candidatos-listos?search=8001')->assertOk()
            ->assertJsonPath('0.empleador', 'STAFFING');
    }

    public function test_avales_antiguos_sin_empleador_usan_el_de_la_requisicion(): void
    {
        $this->actuarComo('admin');
        $staffing = $this->empleador('STAFFING', 'Indirecto');
        $req = Requisicion::create([
            'nro_identificacion_proceso' => $this->unico('PROC'), 'nro_identificacion' => $this->unico('REQ'),
            'fecha_solicitud' => '2026-10-01', 'requeridas' => 1, 'estado' => 'Abierta', 'empleador_id' => $staffing,
        ]);
        $c = Candidato::create([
            'nombres' => 'LUIS PAZ', 'identificacion' => '8002', 'correo' => 'luis@test.co', 'fecha_postulacion' => '2026-10-01',
            'requisicion_id' => $req->id, 'pruebas' => true, 'aval' => true, 'tipo_vinculacion' => 'Indirecta',
        ]);

        $this->assertSame('STAFFING', $c->empleadorNombre());
        $this->postJson('/api/base-ingresos/sync')->assertOk();
        $this->assertSame('STAFFING', BaseIngreso::where('candidato_id', $c->id)->value('empleador'));
    }
}
