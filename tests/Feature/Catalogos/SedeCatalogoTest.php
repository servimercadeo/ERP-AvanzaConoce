<?php

namespace Tests\Feature\Catalogos;

use App\Models\Contrato;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * La sede se guarda como texto y como `sede_id` (HasSedeCatalogo); las pantallas muestran la del
 * id. Editarla debía cambiar los dos: antes solo cambiaba el texto y se seguía viendo la anterior.
 */
class SedeCatalogoTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private int $pereira;
    private int $manizales;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actuarComo('admin');
        $this->pereira = $this->sede('SERVIMERCADEO PEREIRA');
        $this->manizales = $this->sede('SERVIMERCADEO MANIZALES');
    }

    private function crearContrato(): array
    {
        $empleado = $this->usuario('general', ['cedula' => '5550001']);

        return $this->postJson('/api/contratos', [
            'empleado_id' => $empleado->id, 'tipo_contrato' => 'Indefinido', 'cargo' => 'ASESOR COMERCIAL', 'sede' => 'SERVIMERCADEO PEREIRA',
            'fecha_ingreso' => '2026-11-07', 'estado_contrato' => 'Vigente', 'cliente_proyecto' => 'DIRECTV',
        ])->assertCreated()->json();
    }

    public function test_editar_la_sede_del_contrato_la_cambia_y_se_ve_la_nueva(): void
    {
        $creado = $this->crearContrato();
        $this->assertSame($this->pereira, $creado['sede_id']);

        // Como el formulario: el contrato completo con la sede cambiada.
        $this->putJson("/api/contratos/{$creado['id']}", array_merge($creado, ['sede' => 'SERVIMERCADEO MANIZALES']))->assertOk()
            ->assertJsonPath('sede_id', $this->manizales)
            ->assertJsonPath('sede', 'SERVIMERCADEO MANIZALES');

        $this->assertSame($this->manizales, Contrato::find($creado['id'])->sede_id);
        $fila = collect($this->getJson('/api/contratos')->json())->firstWhere('id', $creado['id']);
        $this->assertSame('SERVIMERCADEO MANIZALES', $fila['sede'], 'La lista muestra la sede nueva.');
    }

    public function test_editar_la_sede_de_un_empleado_tambien_la_cambia(): void
    {
        $empleado = $this->usuario('general', ['sede' => 'SERVIMERCADEO PEREIRA']);
        $this->assertSame($this->pereira, $empleado->fresh()->sede_id);

        $empleado->fresh()->update(['sede' => 'SERVIMERCADEO MANIZALES']);

        $this->assertSame($this->manizales, $empleado->fresh()->sede_id);
        $this->assertSame('SERVIMERCADEO MANIZALES', $empleado->fresh()->sede);
    }

    public function test_cambiar_otro_dato_no_toca_la_sede(): void
    {
        $creado = $this->crearContrato();

        $this->putJson("/api/contratos/{$creado['id']}", array_merge($creado, ['cargo' => 'ANALISTA']))->assertOk();

        $this->assertSame($this->pereira, Contrato::find($creado['id'])->sede_id);
    }

    public function test_renombrar_la_sede_se_sigue_viendo_sin_volver_a_guardar(): void
    {
        $creado = $this->crearContrato();
        DB::table('sedes')->where('id', $this->pereira)->update(['nombre' => 'SERVIMERCADEO PEREIRA CENTRO']);

        $this->assertSame('SERVIMERCADEO PEREIRA CENTRO', Contrato::find($creado['id'])->sede);
    }

    public function test_la_migracion_repara_lo_mal_guardado_sin_tocar_las_sedes_renombradas(): void
    {
        $empleado = $this->usuario('general');
        $mal = Contrato::create(['empleado_id' => $empleado->id, 'sede' => 'SERVIMERCADEO PEREIRA', 'estado_contrato' => 'Vigente', 'completado' => true]);
        $renombrada = Contrato::create(['empleado_id' => $empleado->id, 'sede' => 'SERVIMERCADEO PEREIRA', 'estado_contrato' => 'Finalizado', 'completado' => true]);
        // Como quedaba con el error: texto nuevo, id viejo.
        DB::table('contratos')->where('id', $mal->id)->update(['sede' => 'SERVIMERCADEO MANIZALES', 'sede_id' => $this->pereira]);
        // Sede renombrada: el texto viejo ya no es el nombre de ninguna sede; el id es el correcto.
        DB::table('contratos')->where('id', $renombrada->id)->update(['sede' => 'NOMBRE ANTERIOR', 'sede_id' => $this->pereira]);
        DB::table('users')->where('id', $empleado->id)->update(['sede' => 'servimercadeo manizales', 'sede_id' => $this->pereira]);

        (require base_path('database/migrations/2026_11_06_000002_reparar_sede_id_de_ediciones.php'))->up();

        $this->assertSame($this->manizales, (int) DB::table('contratos')->where('id', $mal->id)->value('sede_id'));
        $this->assertSame($this->pereira, (int) DB::table('contratos')->where('id', $renombrada->id)->value('sede_id'));
        $this->assertSame($this->manizales, (int) DB::table('users')->where('id', $empleado->id)->value('sede_id'), 'Sin importar mayúsculas.');
    }
}
