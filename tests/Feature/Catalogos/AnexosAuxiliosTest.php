<?php

namespace Tests\Feature\Catalogos;

use App\Models\AnexoAuxilio;
use App\Models\Contrato;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/** Parámetros > Anexos y Auxilios: las opciones de "Anexo / Auxilio" del contrato. */
class AnexosAuxiliosTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private function contratoCon(string $anexo): Contrato
    {
        $contrato = Contrato::create(['empleado_id' => $this->usuario('general')->id, 'cargo' => 'ASESOR', 'fecha_ingreso' => '2026-01-01',
            'estado_contrato' => 'Vigente', 'completado' => true]);
        $contrato->anexos()->create(['anexo_auxilio' => $anexo, 'valor' => 50000]);

        return $contrato;
    }

    public function test_arranca_con_las_8_opciones_y_las_ofrece_en_contratos(): void
    {
        $this->actuarComo('admin');
        $esperadas = ['AUXILIO DE COMUNICACION', 'AUXILIO DE HERRAMIENTA', 'AUXILIO EXTRALEGAL DE CONECTIVIDAD', 'AUXILIO EXTRALEGAL DE RODAMIENTO',
            'AUXILIO EXTRALEGAL DE RODAMIENTO X W.O', 'BONO NO SALARIAL', 'COMISION FIJA', 'VARIABLE'];

        $this->assertSame($esperadas, collect($this->getJson('/api/anexos-auxilios')->assertOk()->json())->pluck('nombre')->all());
        $this->assertSame($esperadas, $this->getJson('/api/catalogos')->json('anexos_auxilios'));
    }

    public function test_crear_sale_en_contratos_y_no_permite_duplicados(): void
    {
        $this->actuarComo('admin');
        $this->postJson('/api/anexos-auxilios', ['nombre' => '  auxilio   de  vivienda '])->assertCreated()->assertJsonPath('nombre', 'AUXILIO DE VIVIENDA');
        $this->assertContains('AUXILIO DE VIVIENDA', $this->getJson('/api/catalogos')->json('anexos_auxilios'));

        $this->postJson('/api/anexos-auxilios', ['nombre' => 'Auxilio de Vivienda'])->assertJsonPath('errors.nombre.0', 'Ya existe un anexo o auxilio con ese nombre.');
        $this->postJson('/api/anexos-auxilios', ['nombre' => ' '])->assertJsonPath('errors.nombre.0', 'Escribe el nombre del anexo o auxilio.');
    }

    public function test_renombrar_actualiza_los_contratos_y_en_uso_no_se_elimina(): void
    {
        $this->actuarComo('admin');
        $contrato = $this->contratoCon('Variable');
        $otro = $this->contratoCon('BONO NO SALARIAL');
        $variable = AnexoAuxilio::where('nombre', 'VARIABLE')->firstOrFail();

        $fila = collect($this->getJson('/api/anexos-auxilios')->json())->firstWhere('nombre', 'VARIABLE');
        $this->assertSame(1, $fila['contratos_count']);

        $this->putJson("/api/anexos-auxilios/{$variable->id}", ['nombre' => 'comision variable'])->assertOk();
        $this->assertSame('COMISION VARIABLE', $contrato->anexos()->value('anexo_auxilio'));
        $this->assertSame('BONO NO SALARIAL', $otro->anexos()->value('anexo_auxilio'), 'Los demás no se tocan');

        $this->deleteJson("/api/anexos-auxilios/{$variable->id}")->assertStatus(422)
            ->assertJsonPath('message', 'No se puede eliminar «COMISION VARIABLE»: está en 1 contrato(s).');
        $sinUso = AnexoAuxilio::where('nombre', 'COMISION FIJA')->firstOrFail();
        $this->deleteJson("/api/anexos-auxilios/{$sinUso->id}")->assertNoContent();
        $this->assertNotContains('COMISION FIJA', $this->getJson('/api/catalogos')->json('anexos_auxilios'));
    }

    public function test_la_matriz_de_permisos_controla_quien_lo_administra(): void
    {
        $this->actuarComo('operaciones');
        $this->postJson('/api/anexos-auxilios', ['nombre' => 'AUXILIO X'])->assertCreated();
        $id = AnexoAuxilio::where('nombre', 'AUXILIO X')->value('id');

        // Se le niega "Eliminar" y luego toda la pestaña.
        \App\Models\PermisoDenegado::create(['rol' => 'operaciones', 'modulo_id' => 'parametros', 'submodulo_id' => 'anexos_auxilios', 'archivo_id' => '', 'accion' => 'eliminar']);
        $this->deleteJson("/api/anexos-auxilios/{$id}")->assertForbidden();
        \App\Models\PermisoDenegado::create(['rol' => 'operaciones', 'modulo_id' => 'parametros', 'submodulo_id' => 'anexos_auxilios', 'archivo_id' => '', 'accion' => '']);
        $this->getJson('/api/anexos-auxilios')->assertForbidden();
        $this->postJson('/api/anexos-auxilios', ['nombre' => 'AUXILIO Y'])->assertForbidden();

        // Contratos sigue recibiendo la lista (no depende de esta pestaña).
        $this->assertContains('AUXILIO X', $this->getJson('/api/catalogos')->json('anexos_auxilios'));
    }
}
