<?php

namespace Tests\Feature\Rendimiento;

use App\Models\Sede;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * En producción cada consulta es un viaje a la BD (~60 ms): un listado no puede hacer una
 * consulta por registro. Estas pruebas fallan si el número de consultas crece con los datos.
 */
class ConsultasPorPeticionTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private function consultas(string $url): int
    {
        $n = 0;
        DB::listen(function () use (&$n) { $n++; });
        $this->getJson($url)->assertOk();
        DB::getEventDispatcher()->forget(\Illuminate\Database\Events\QueryExecuted::class);

        return $n;
    }

    private function empleadoListo(int $i, Sede $sede): void
    {
        $cedula = (string) (5000000 + $i);
        $emp = $this->usuario('general', ['nombres' => "LISTO{$i}", 'apellidos' => 'PRUEBA', 'cedula' => $cedula, 'sede' => $sede->nombre,
            // Correo de relleno (como el de un técnico): el autocompletado busca el real en otras fuentes.
            'email' => "{$cedula}@avanzaconoce.com"]);
        DB::table('contratos')->insert([
            'empleado_id' => $emp->id, 'completado' => true, 'estado_contrato' => 'Activo', 'sede_id' => $sede->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->respuestaIngreso($cedula, "listo{$i}@correo.co");
    }

    /** Formulario de ingreso con los campos obligatorios de la tabla. */
    private function respuestaIngreso(string $cedula, string $correo): void
    {
        $campos = ['apellidos', 'lugar_nacimiento', 'estado_civil', 'numero_hijos', 'rh', 'nivel_escolaridad', 'profesion', 'ciudad',
            'barrio', 'direccion', 'estrato', 'celular', 'emergencia_nombre', 'emergencia_telefono', 'emergencia_parentesco', 'eps', 'afp',
            'talla_camisa', 'talla_pantalon', 'talla_zapatos'];
        DB::table('respuestas_ingresos')->insert(array_fill_keys($campos, 'X') + [
            'documento' => $cedula, 'nombres' => 'LISTO', 'correo' => $correo, 'fecha_nacimiento' => '1990-01-01',
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function test_empleados_listos_para_alta_no_consulta_por_empleado(): void
    {
        $sede = Sede::first() ?? Sede::create(['nombre' => 'SEDE PRUEBA']);
        $this->actingAs($this->usuario('th'));

        foreach (range(1, 3) as $i) {
            $this->empleadoListo($i, $sede);
        }
        $conTres = $this->consultas('/api/empleados/candidatos-listos?search=LISTO');

        foreach (range(4, 20) as $i) {
            $this->empleadoListo($i, $sede);
        }
        $conVeinte = $this->consultas('/api/empleados/candidatos-listos?search=LISTO');

        $this->assertSame($conTres, $conVeinte, 'Las consultas no deben crecer con el número de empleados');
        // Y sigue armando los datos de cada uno (sede del contrato, correo del formulario).
        $fila = collect($this->getJson('/api/empleados/candidatos-listos?search=LISTO7')->json())->firstWhere('cedula', '5000007');
        $this->assertSame($sede->nombre, $fila['sede']);
        $this->assertSame('listo7@correo.co', $fila['email']);
    }

    public function test_correo_ya_usado_por_otro_empleado_no_se_propone(): void
    {
        $sede = Sede::first() ?? Sede::create(['nombre' => 'SEDE PRUEBA']);
        $this->actingAs($this->usuario('th'));
        $this->empleadoListo(1, $sede);
        $this->usuario('general', ['email' => 'listo1@correo.co', 'cedula' => '999111']);

        $fila = collect($this->getJson('/api/empleados/candidatos-listos?search=LISTO1')->json())->firstWhere('cedula', '5000001');
        $this->assertNotSame('listo1@correo.co', $fila['email']);
    }

    public function test_candidato_mas_reciente_con_aval_gana(): void
    {
        $sede = Sede::first() ?? Sede::create(['nombre' => 'SEDE PRUEBA']);
        $this->actingAs($this->usuario('th'));
        $this->empleadoListo(1, $sede);
        DB::table('respuestas_ingresos')->where('documento', '5000001')->delete();
        foreach ([['viejo@correo.co', false, '2026-01-01'], ['aval@correo.co', true, '2026-02-01'], ['nuevo@correo.co', false, '2026-03-01']] as [$correo, $aval, $fecha]) {
            DB::table('candidatos')->insert(['nombres' => 'LISTO', 'identificacion' => '5000001', 'correo' => $correo, 'aval' => $aval,
                'fecha_postulacion' => $fecha, 'created_at' => $fecha, 'updated_at' => $fecha]);
        }

        $fila = collect($this->getJson('/api/empleados/candidatos-listos?search=LISTO1')->json())->firstWhere('cedula', '5000001');
        $this->assertSame('aval@correo.co', $fila['email']);
    }

    public function test_catalogos_en_pocas_consultas_y_completos(): void
    {
        $this->actingAs($this->usuario('th'));
        $id = (int) DB::table('eps')->max('id');
        DB::table('eps')->insert([['id' => $id + 1, 'nombre' => 'SURA'], ['id' => $id + 2, 'nombre' => 'NUEVA EPS'], ['id' => $id + 3, 'nombre' => 'SURA']]);
        DB::table('users')->where('id', $this->usuario('general')->id)->update(['tipo_funcionario' => 'Operativo']);

        $this->assertLessThanOrEqual(10, $this->consultas('/api/catalogos'));
        $cat = $this->getJson('/api/catalogos')->json();
        // DISTINCT y orden por nombre, como antes.
        $this->assertSame(['NUEVA EPS', 'SURA'], array_values(array_intersect($cat['eps'], ['NUEVA EPS', 'SURA'])));
        $this->assertSame(1, collect($cat['eps'])->filter(fn ($e) => $e === 'SURA')->count());
        $this->assertContains('Operativo', $cat['tipos_funcionario']);
        foreach (['cargos', 'arls', 'cajas', 'pensiones', 'cesantias', 'bancos', 'tipos_rh', 'sedes', 'areas_empresa', 'regionales', 'empleadores'] as $clave) {
            $this->assertArrayHasKey($clave, $cat);
        }
    }
}
