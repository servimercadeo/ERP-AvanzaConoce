<?php

namespace Tests\Feature\Inventario;

use App\Mail\ActaAsignacionInventarioMail;
use App\Models\InventarioProducto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Inventarios > Asignación de Inventario (custodia por empleado).
 */
class AsignacionInventarioTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private int $sede;
    private int $tipo;
    private \App\Models\User $empleado;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->actuarComo('consultor', ['name' => 'Quien Asigna']);
        $this->sede = $this->sede();
        $this->tipo = $this->tipoProducto('PORTATIL', 'Equipos');
        $this->empleado = $this->usuario('consultor', ['name' => 'Empleado Custodio', 'email' => 'custodio@test.co']);
    }

    private function asignar(InventarioProducto $inv, array $extra = [])
    {
        return $this->postJson('/api/asignaciones-inventario', array_merge([
            'inventario_producto_id' => $inv->id, 'user_id' => $this->empleado->id, 'cantidad' => 1,
        ], $extra));
    }

    public function test_asignar_por_cantidad_descuenta_el_stock(): void
    {
        $inv = $this->inventario($this->tipo, $this->sede, 10);

        $this->asignar($inv, ['cantidad' => 4, 'observacion' => 'Para el proyecto'])
            ->assertCreated()->assertJsonPath('cantidad', 4)->assertJsonPath('activa', true)
            ->assertJsonPath('asignado_a', 'Empleado Custodio')->assertJsonPath('asignado_por', 'Quien Asigna');

        $this->assertSame(6, $inv->fresh()->cantidad);
    }

    public function test_no_se_puede_asignar_mas_de_lo_disponible(): void
    {
        $inv = $this->inventario($this->tipo, $this->sede, 2);

        $this->asignar($inv, ['cantidad' => 3])->assertStatus(422)->assertJsonValidationErrors('cantidad');

        $this->assertSame(2, $inv->fresh()->cantidad);
        $this->assertDatabaseCount('asignaciones_inventario', 0);
    }

    public function test_asignar_un_serial_puntual_lo_saca_de_los_disponibles(): void
    {
        $inv = $this->inventario($this->tipo, $this->sede, 3, ['S1', 'S2', 'S3']);

        $this->asignar($inv, ['serial' => 'S2'])->assertCreated()->assertJsonPath('serial', 'S2');

        $this->assertSame(2, $inv->fresh()->cantidad);
        $this->assertEqualsCanonicalizing(['S1', 'S3'], $inv->series()->pluck('serial')->all());
    }

    public function test_un_serial_exige_cantidad_uno_y_que_este_disponible(): void
    {
        $inv = $this->inventario($this->tipo, $this->sede, 3, ['S1', 'S2', 'S3']);

        $this->asignar($inv, ['serial' => 'S1', 'cantidad' => 2])->assertStatus(422)->assertJsonValidationErrors('cantidad');
        $this->asignar($inv, ['serial' => 'NOEXISTE'])->assertStatus(422)->assertJsonValidationErrors('serial');

        $this->assertSame(3, $inv->fresh()->cantidad);
        $this->assertSame(3, $inv->series()->count());
    }

    public function test_el_mismo_serial_no_se_puede_asignar_dos_veces(): void
    {
        $inv = $this->inventario($this->tipo, $this->sede, 2, ['S1', 'S2']);

        $this->asignar($inv, ['serial' => 'S1'])->assertCreated();
        $this->asignar($inv, ['serial' => 'S1'])->assertStatus(422);
    }

    public function test_validaciones_basicas(): void
    {
        $this->postJson('/api/asignaciones-inventario', [])->assertStatus(422)
            ->assertJsonValidationErrors(['inventario_producto_id', 'user_id', 'cantidad']);
    }

    public function test_devolver_restituye_cantidad_y_serial(): void
    {
        $inv = $this->inventario($this->tipo, $this->sede, 3, ['S1', 'S2', 'S3']);
        $id = $this->asignar($inv, ['serial' => 'S2'])->json('id');

        $this->postJson("/api/asignaciones-inventario/$id/devolver")->assertOk()->assertJsonPath('activa', false);

        $this->assertSame(3, $inv->fresh()->cantidad);
        $this->assertContains('S2', $inv->series()->pluck('serial')->all());
    }

    public function test_devolver_por_cantidad_suma_de_vuelta(): void
    {
        $inv = $this->inventario($this->tipo, $this->sede, 10);
        $id = $this->asignar($inv, ['cantidad' => 4])->json('id');

        $this->postJson("/api/asignaciones-inventario/$id/devolver")->assertOk();

        $this->assertSame(10, $inv->fresh()->cantidad);
    }

    public function test_no_se_puede_devolver_dos_veces(): void
    {
        $inv = $this->inventario($this->tipo, $this->sede, 10);
        $id = $this->asignar($inv, ['cantidad' => 4])->json('id');

        $this->postJson("/api/asignaciones-inventario/$id/devolver")->assertOk();
        $this->postJson("/api/asignaciones-inventario/$id/devolver")->assertStatus(422);

        $this->assertSame(10, $inv->fresh()->cantidad, 'La segunda devolución no debe sumar otra vez.');
    }

    public function test_listado_filtra_por_estado_y_empleado(): void
    {
        $otro = $this->usuario('consultor', ['name' => 'Otro Empleado']);
        $inv = $this->inventario($this->tipo, $this->sede, 10);
        $activa = $this->asignar($inv)->json('id');
        $devuelta = $this->asignar($inv)->json('id');
        $this->postJson("/api/asignaciones-inventario/$devuelta/devolver")->assertOk();
        $deOtro = $this->asignar($inv, ['user_id' => $otro->id])->json('id');

        $activas = collect($this->getJson('/api/asignaciones-inventario?estado=activas')->json())->pluck('id');
        $this->assertTrue($activas->contains($activa));
        $this->assertFalse($activas->contains($devuelta));

        $devueltas = collect($this->getJson('/api/asignaciones-inventario?estado=devueltas')->json())->pluck('id');
        $this->assertSame([$devuelta], $devueltas->all());

        $delOtro = collect($this->getJson("/api/asignaciones-inventario?user_id={$otro->id}")->json())->pluck('id');
        $this->assertSame([$deOtro], $delOtro->all());
    }

    public function test_acta_de_entrega_se_envia_al_empleado_custodio(): void
    {
        $inv = $this->inventario($this->tipo, $this->sede, 5);
        $id = $this->asignar($inv)->json('id');

        $this->postJson("/api/asignaciones-inventario/$id/acta-entrega")
            ->assertOk()->assertJson(['enviada' => true, 'destinatario' => 'custodio@test.co']);

        Mail::assertSent(ActaAsignacionInventarioMail::class, fn ($m) => $m->hasTo('custodio@test.co'));
    }

    public function test_acta_de_entrega_sin_correo_real_informa_el_motivo_sin_fallar(): void
    {
        $this->empleado->update(['cedula' => '555', 'email' => '555@avanzaconoce.com']);
        $inv = $this->inventario($this->tipo, $this->sede, 5);
        $id = $this->asignar($inv)->json('id');

        $this->postJson("/api/asignaciones-inventario/$id/acta-entrega")
            ->assertOk()->assertJsonPath('enviada', false)->assertJsonStructure(['motivo']);

        Mail::assertNothingSent();
    }
}
