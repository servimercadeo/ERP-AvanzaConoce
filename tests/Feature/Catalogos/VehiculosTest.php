<?php

namespace Tests\Feature\Catalogos;

use App\Models\Vehiculo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class VehiculosTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    public function test_crea_un_vehiculo_con_tarjeta_de_propiedad_y_tecnico_asignado(): void
    {
        $this->actuarComo('admin');
        $tecnico = $this->usuario('tecnico', ['cedula' => '9000000001']);

        $resp = $this->postJson('/api/vehiculos', [
            'tipo'                      => 'Carro',
            'placa'                     => 'abc123',
            'cc_propietario'            => '1020304050',
            'tecnico_asignado_id'       => $tecnico->id,
            'fecha_matricula'           => '2024-01-15',
            'fecha_vence_soat'          => '2026-11-01',
            'fecha_vence_tecnomecanica' => '2026-12-01',
            'tarjeta_propiedad_frontal' => UploadedFile::fake()->image('frontal.jpg'),
            'tarjeta_propiedad_trasera' => UploadedFile::fake()->image('trasera.jpg'),
        ]);

        $resp->assertCreated();
        // La placa se guarda en mayúsculas.
        $this->assertSame('ABC123', $resp->json('placa'));
        $this->assertSame('2026-01-15', $resp->json('fecha_vence_matricula'));
        $this->assertSame($tecnico->id, $resp->json('tecnico_asignado.id'));
        $this->assertNotNull($resp->json('tarjeta_propiedad_frontal'));

        $vehiculo = Vehiculo::firstOrFail();
        $this->get("/api/vehiculos/{$vehiculo->id}/archivo/frontal")->assertOk();
        $this->get("/api/vehiculos/{$vehiculo->id}/archivo/trasera")->assertOk();
    }

    public function test_la_placa_no_se_puede_repetir(): void
    {
        $this->actuarComo('admin');
        Vehiculo::create(['tipo' => 'Moto', 'placa' => 'XYZ987']);

        $this->postJson('/api/vehiculos', ['tipo' => 'Moto', 'placa' => 'xyz987'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('placa');
    }

    public function test_editar_reemplaza_solo_el_archivo_enviado_y_conserva_el_otro(): void
    {
        $this->actuarComo('admin');
        $vehiculo = Vehiculo::create([
            'tipo' => 'Carro', 'placa' => 'EDT111',
            'tarjeta_propiedad_frontal' => 'vehiculos/original-frontal.jpg',
            'tarjeta_propiedad_trasera' => 'vehiculos/original-trasera.jpg',
        ]);

        $resp = $this->post("/api/vehiculos/{$vehiculo->id}", [
            '_method' => 'PUT',
            'tipo'    => 'Carro',
            'placa'   => 'EDT111',
            'tarjeta_propiedad_frontal' => UploadedFile::fake()->image('nueva-frontal.jpg'),
        ]);

        $resp->assertOk();
        $this->assertNotSame('vehiculos/original-frontal.jpg', $resp->json('tarjeta_propiedad_frontal'));
        $this->assertSame('vehiculos/original-trasera.jpg', $resp->json('tarjeta_propiedad_trasera'));
    }

    public function test_eliminar_borra_el_vehiculo(): void
    {
        $this->actuarComo('admin');
        $vehiculo = Vehiculo::create(['tipo' => 'Moto', 'placa' => 'DEL456']);

        $this->deleteJson("/api/vehiculos/{$vehiculo->id}")->assertNoContent();
        $this->assertModelMissing($vehiculo);
    }

    public function test_el_listado_de_tecnicos_solo_trae_el_rol_tecnico(): void
    {
        $this->actuarComo('admin');
        $this->usuario('tecnico', ['name' => 'Juan Técnico']);
        $this->usuario('operaciones', ['name' => 'Ana Operaciones']);

        $resp = $this->getJson('/api/vehiculos/tecnicos')->assertOk();
        $nombres = collect($resp->json())->pluck('name');

        $this->assertTrue($nombres->contains('Juan Técnico'));
        $this->assertFalse($nombres->contains('Ana Operaciones'));
    }
}
