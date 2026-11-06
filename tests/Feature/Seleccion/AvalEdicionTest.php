<?php

namespace Tests\Feature\Seleccion;

use App\Models\BaseIngreso;
use App\Models\Candidato;
use App\Models\Requisicion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Avales: la lista muestra los datos de la persona desde el candidato y los laborales desde la
 * requisición. Editar en el aval un dato de la persona debía verse; antes quedaba guardado solo en
 * el aval y la pantalla seguía mostrando el anterior.
 */
class AvalEdicionTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->actuarComo('th');
    }

    private function aval(?int $requisicionId = null): BaseIngreso
    {
        $candidato = Candidato::create([
            'nombres' => 'ANA RUIZ', 'identificacion' => '61000001', 'correo' => 'ana@test.co', 'celular' => '3001112233',
            'fecha_postulacion' => now()->toDateString(), 'requisicion_id' => $requisicionId, 'tipo_vinculacion' => 'Directa',
        ]);

        return BaseIngreso::create([
            'candidato_id' => $candidato->id, 'documento_identificacion' => '61000001', 'nombre_completo' => 'ANA RUIZ',
            'correo' => 'ana@test.co', 'telefono' => '3001112233', 'cargo' => 'CARGO DEL AVAL', 'lider_inmediato' => 'LIDER DEL AVAL',
        ]);
    }

    private function enLaLista(BaseIngreso $aval): array
    {
        return collect($this->getJson('/api/base-ingresos')->assertOk()->json())->firstWhere('id', $aval->id);
    }

    public function test_editar_los_datos_de_la_persona_en_el_aval_se_ve_y_queda_en_el_candidato(): void
    {
        $aval = $this->aval();

        $this->putJson("/api/base-ingresos/{$aval->id}", [
            'nombre_completo' => 'ANA MARIA RUIZ', 'telefono' => '3109998877', 'correo' => 'ana.nueva@test.co', 'tipo_vinculacion' => 'Indirecta',
        ])->assertOk();

        $fila = $this->enLaLista($aval);
        $this->assertSame(['ANA MARIA RUIZ', '3109998877', 'ana.nueva@test.co', 'Indirecta'],
            [$fila['nombre_completo'], $fila['telefono'], $fila['correo'], $fila['tipo_vinculacion']]);
        $c = $aval->candidato->fresh();
        $this->assertSame(['ANA MARIA RUIZ', '3109998877', 'ana.nueva@test.co', 'Indirecta'], [$c->nombres, $c->celular, $c->correo, $c->tipo_vinculacion]);
    }

    public function test_sin_requisicion_se_ven_el_cargo_y_el_lider_del_aval(): void
    {
        $aval = $this->aval();

        $fila = $this->enLaLista($aval);
        $this->assertSame('CARGO DEL AVAL', $fila['cargo'], 'Antes salía vacío.');
        $this->assertSame('LIDER DEL AVAL', $fila['lider_inmediato']);

        $this->putJson("/api/base-ingresos/{$aval->id}", ['cargo' => 'ANALISTA'])->assertOk();
        $this->assertSame('ANALISTA', $this->enLaLista($aval)['cargo']);
    }

    public function test_con_requisicion_el_cargo_y_el_lider_salen_de_ella(): void
    {
        // cargos.id no es autoincremental (catálogo fijo): se asigna a mano.
        $cargo = (int) DB::table('cargos')->max('id') + 1;
        DB::table('cargos')->insert(['id' => $cargo, 'nombre' => 'CARGO DE LA REQUISICION', 'created_at' => now(), 'updated_at' => now()]);
        $req = Requisicion::create(['nro_identificacion_proceso' => 'REQ-1', 'fecha_solicitud' => '2026-11-01', 'cargo_id' => $cargo, 'responsable' => 'LIDER REQ']);

        $fila = $this->enLaLista($this->aval($req->id));

        $this->assertSame('CARGO DE LA REQUISICION', $fila['cargo']);
        $this->assertSame('LIDER REQ', $fila['lider_inmediato']);
    }

    public function test_un_dato_vacio_no_borra_el_del_candidato(): void
    {
        $aval = $this->aval();

        $this->putJson("/api/base-ingresos/{$aval->id}", ['telefono' => null, 'fecha_aval' => '2026-11-05'])->assertOk();

        $this->assertSame('3001112233', $aval->candidato->fresh()->celular);
    }
}
