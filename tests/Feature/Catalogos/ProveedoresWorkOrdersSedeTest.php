<?php

namespace Tests\Feature\Catalogos;

use App\Models\ProveedorWorkOrder;
use App\Models\Sede;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

class ProveedoresWorkOrdersSedeTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs($this->usuario('admin'));
    }

    private function crearWo(string $numero, ?string $proveedor, array $extra = []): void
    {
        WorkOrder::create(['numero_wo' => $numero, 'numero_item' => '', 'proveedor' => $proveedor] + $extra);
    }

    private function sedeExportada(string $numero): ?string
    {
        return collect($this->getJson('/api/work-orders')->assertOk()->json())
            ->firstWhere('numero_wo', $numero)['sede_proveedor'];
    }

    public function test_el_exporte_saca_la_sede_del_proveedor_y_no_la_del_tecnico(): void
    {
        $this->usuario('tecnico', ['cedula' => '555', 'sede' => 'SEDE DEL TECNICO']);
        $this->postJson('/api/sedes', [
            'nombre' => 'SERVIMERCADEO TULUA',
            'proveedores_work_orders' => ['CO-I005135-SERVIMERCADEO TULUA'],
        ])->assertCreated()->assertJsonPath('proveedores_work_orders.0.codigo', 'CO-I005135');
        $this->crearWo('WO1', 'CO-I005135-SERVIMERCADEO TULUA', ['cedula_tecnico' => '555']);

        $this->assertSame('SERVIMERCADEO TULUA', $this->sedeExportada('WO1'));
    }

    public function test_asocia_por_codigo_aunque_cambie_el_texto_del_proveedor(): void
    {
        $this->postJson('/api/sedes', [
            'nombre' => 'SERVIMERCADEO TULUA',
            'proveedores_work_orders' => ['CO-I005135-SERVIMERCADEO'],
        ])->assertCreated();
        $this->crearWo('WO1', ' co-i005135-servimercadeo tuluá ');

        $this->assertSame('SERVIMERCADEO TULUA', $this->sedeExportada('WO1'));
    }

    public function test_un_proveedor_sin_codigo_tambien_se_puede_asociar(): void
    {
        $this->postJson('/api/sedes', ['nombre' => 'SEDE DTV', 'proveedores_work_orders' => ['DIRECTV']])->assertCreated();
        $this->crearWo('WO1', 'directv');

        $this->assertSame('SEDE DTV', $this->sedeExportada('WO1'));
    }

    public function test_una_sede_solo_admite_un_proveedor(): void
    {
        $this->postJson('/api/sedes', ['nombre' => 'SEDE NUEVA', 'proveedores_work_orders' => ['CO-I005135-X', 'CO-I005299-Y']])
            ->assertUnprocessable()
            ->assertJsonPath('errors.proveedores_work_orders.0', 'Una sede solo puede tener un proveedor. Quita el que tiene para cambiarlo.');
        $this->assertDatabaseMissing('sedes', ['nombre' => 'SEDE NUEVA']);

        $id = $this->postJson('/api/sedes', ['nombre' => 'SEDE A', 'proveedores_work_orders' => ['CO-I005135-X']])
            ->assertCreated()->json('id');

        $this->putJson("/api/sedes/{$id}", ['nombre' => 'SEDE A', 'proveedores_work_orders' => ['CO-I005135-X', 'CO-I005299-Y']])
            ->assertUnprocessable();
        $this->assertSame(['CO-I005135'], ProveedorWorkOrder::where('sede_id', $id)->pluck('codigo')->all());
    }

    public function test_quitar_el_proveedor_permite_poner_otro_y_lo_libera_para_otra_sede(): void
    {
        $id = $this->postJson('/api/sedes', ['nombre' => 'SEDE A', 'proveedores_work_orders' => ['CO-I005135-X']])
            ->assertCreated()->json('id');
        $otra = Sede::create(['nombre' => 'SEDE B']);

        $this->putJson("/api/sedes/{$id}", ['nombre' => 'SEDE A', 'proveedores_work_orders' => []])->assertOk();
        $this->putJson("/api/sedes/{$id}", ['nombre' => 'SEDE A', 'proveedores_work_orders' => ['CO-I005299-Y']])->assertOk();
        $this->putJson("/api/sedes/{$otra->id}", ['nombre' => 'SEDE B', 'proveedores_work_orders' => ['CO-I005135-X']])->assertOk();

        $this->assertDatabaseHas('proveedores_work_orders', ['codigo' => 'CO-I005299', 'sede_id' => $id]);
        $this->assertDatabaseHas('proveedores_work_orders', ['codigo' => 'CO-I005135', 'sede_id' => $otra->id]);
    }

    public function test_la_sede_que_ya_tenia_dos_proveedores_se_puede_editar_y_quitarle_uno(): void
    {
        $sede = Sede::create(['nombre' => 'SERVIMERCADEO PEREIRA']);
        ProveedorWorkOrder::create(['sede_id' => $sede->id, 'codigo' => 'CO-I004174', 'nombre' => 'CO-I004174-X']);
        ProveedorWorkOrder::create(['sede_id' => $sede->id, 'codigo' => 'CO-I005115', 'nombre' => 'CO-I005115-Y']);

        $this->putJson("/api/sedes/{$sede->id}", ['nombre' => 'PEREIRA', 'proveedores_work_orders' => ['CO-I004174-X', 'CO-I005115-Y']])
            ->assertOk()->assertJsonCount(2, 'proveedores_work_orders');
        $this->putJson("/api/sedes/{$sede->id}", ['nombre' => 'PEREIRA', 'proveedores_work_orders' => ['CO-I004174-X', 'CO-I009999-Z']])
            ->assertUnprocessable();
        $this->putJson("/api/sedes/{$sede->id}", ['nombre' => 'PEREIRA', 'proveedores_work_orders' => ['CO-I004174-X']])
            ->assertOk()->assertJsonCount(1, 'proveedores_work_orders');
    }

    public function test_sin_asociacion_o_sin_proveedor_la_sede_queda_vacia(): void
    {
        $this->crearWo('WO1', 'CO-I005075-SERVIMERCADEO BUENAVENTURA');
        $this->crearWo('WO2', null);

        $this->assertNull($this->sedeExportada('WO1'));
        $this->assertNull($this->sedeExportada('WO2'));
    }

    public function test_un_proveedor_no_puede_quedar_en_dos_sedes(): void
    {
        $this->postJson('/api/sedes', ['nombre' => 'SEDE A', 'proveedores_work_orders' => ['CO-I005135-SERVIMERCADEO TULUA']])
            ->assertCreated();

        $this->postJson('/api/sedes', ['nombre' => 'SEDE B', 'proveedores_work_orders' => ['CO-I005135-SERVIMERCADEO']])
            ->assertUnprocessable()
            ->assertJsonPath('errors.proveedores_work_orders.0', 'CO-I005135-SERVIMERCADEO TULUA ya está asociado a la sede SEDE A.');

        $this->assertDatabaseMissing('sedes', ['nombre' => 'SEDE B']);
    }

    public function test_si_falla_la_asociacion_no_se_guarda_la_edicion_de_la_sede(): void
    {
        $this->postJson('/api/sedes', ['nombre' => 'SEDE A', 'proveedores_work_orders' => ['CO-I005135-X']])->assertCreated();
        $otra = Sede::create(['nombre' => 'SEDE B']);

        $this->putJson("/api/sedes/{$otra->id}", ['nombre' => 'SEDE B EDITADA', 'proveedores_work_orders' => ['CO-I005135-X']])
            ->assertUnprocessable();

        $this->assertSame('SEDE B', $otra->fresh()->nombre);
    }

    public function test_editar_sin_mandar_la_lista_no_la_toca_y_con_lista_vacia_la_borra(): void
    {
        $id = $this->postJson('/api/sedes', ['nombre' => 'SEDE A', 'proveedores_work_orders' => ['CO-I005135-X']])
            ->assertCreated()->json('id');

        $this->putJson("/api/sedes/{$id}", ['nombre' => 'SEDE A2'])->assertOk()
            ->assertJsonCount(1, 'proveedores_work_orders');

        $this->putJson("/api/sedes/{$id}", ['nombre' => 'SEDE A2', 'proveedores_work_orders' => []])->assertOk()
            ->assertJsonCount(0, 'proveedores_work_orders');
    }

    public function test_el_listado_trae_los_proveedores_de_cada_sede(): void
    {
        $this->postJson('/api/sedes', ['nombre' => 'SEDE A', 'proveedores_work_orders' => ['CO-I005135-X']])->assertCreated();

        $sede = collect($this->getJson('/api/sedes')->assertOk()->json())->firstWhere('nombre', 'SEDE A');

        $this->assertSame('CO-I005135', $sede['proveedores_work_orders'][0]['codigo']);
    }

    public function test_eliminar_la_sede_quita_sus_proveedores(): void
    {
        $id = $this->postJson('/api/sedes', ['nombre' => 'SEDE A', 'proveedores_work_orders' => ['CO-I005135-X']])
            ->assertCreated()->json('id');

        $this->deleteJson("/api/sedes/{$id}")->assertNoContent();

        $this->assertDatabaseMissing('proveedores_work_orders', ['codigo' => 'CO-I005135']);
    }

    public function test_las_opciones_unen_work_orders_y_catalogo_sin_repetir_codigo(): void
    {
        $this->crearWo('WO1', 'CO-I005135-SERVIMERCADEO TULUA');
        $this->crearWo('WO2', '');

        $proveedores = collect($this->getJson('/api/sedes/options')->assertOk()->json('proveedores'));

        $this->assertSame(
            ['CO-I005135-SERVIMERCADEO TULUA'],
            $proveedores->where('codigo', 'CO-I005135')->pluck('nombre')->all(),
        );
        $this->assertSame('CO-I005115-SERVIMERCADEO', $proveedores->firstWhere('codigo', 'CO-I005115')['nombre']);
        $this->assertFalse($proveedores->contains('nombre', ''));
    }

    public function test_la_migracion_asocia_cada_sede_por_su_codigo_ci(): void
    {
        $atlantico = Sede::create(['nombre' => 'SERVIMERCADEO ATLANTICO', 'codigo_instalador' => ' co-i004271 ']);
        Sede::create(['nombre' => 'CODIGO REPETIDO', 'codigo_instalador' => 'CO-I004271']);
        Sede::create(['nombre' => 'CODIGO QUE NO ES DE PROVEEDOR', 'codigo_instalador' => 'N/A']);
        $sinWo = Sede::create(['nombre' => 'SIN WORK ORDERS', 'codigo_instalador' => 'CO-I005115']);
        $this->crearWo('WO1', 'CO-I004271-SERVIMERCADEO BARRANQUILL');

        $migracion = require database_path('migrations/2026_11_02_000002_asociar_proveedores_por_codigo_instalador.php');
        $migracion->up();
        $migracion->up();

        $this->assertSame(2, ProveedorWorkOrder::count());
        $this->assertDatabaseHas('proveedores_work_orders', [
            'sede_id' => $atlantico->id, 'codigo' => 'CO-I004271', 'nombre' => 'CO-I004271-SERVIMERCADEO BARRANQUILL',
        ]);
        $this->assertDatabaseHas('proveedores_work_orders', [
            'sede_id' => $sinWo->id, 'codigo' => 'CO-I005115', 'nombre' => 'CO-I005115-SERVIMERCADEO',
        ]);
        $this->assertSame('SERVIMERCADEO ATLANTICO', $this->sedeExportada('WO1'));
    }

    private function correrMigracionDeRestantes(): void
    {
        $migracion = require database_path('migrations/2026_11_02_000003_asociar_proveedores_restantes_a_sedes.php');
        $migracion->up();
    }

    private function idPorNombre(string $tabla, string $nombre): int
    {
        return DB::table($tabla)->where('nombre', $nombre)->value('id')
            ?? DB::table($tabla)->insertGetId(['nombre' => $nombre, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_la_migracion_crea_las_sedes_faltantes_como_las_demas_y_las_asocia(): void
    {
        Sede::create(['nombre' => 'SERVIMERCADEO CALI']);
        $regional = $this->idPorNombre('regionales', 'OCCIDENTE');
        $proyecto = $this->idPorNombre('proyectos', 'DIRECTV');
        DB::table('ciudades')->insert(['id' => 1038, 'nombre' => 'Tuluá', 'created_at' => now(), 'updated_at' => now()]);
        $this->crearWo('WO1', 'CO-I005135-SERVIMERCADEO TULUA');

        $this->correrMigracionDeRestantes();
        $this->correrMigracionDeRestantes();

        $tulua = Sede::where('nombre', 'SERVIMERCADEO TULUA')->sole();
        $this->assertSame(1038, $tulua->id_ciudad);
        $this->assertSame($regional, $tulua->regional_id);
        $this->assertSame($proyecto, $tulua->proyecto_id);
        $this->assertSame('Punto de Venta', $tulua->tipo_sede);
        $this->assertSame('Activa', $tulua->estado);
        $this->assertSame('CO-I005135', $tulua->codigo_instalador);
        $this->assertDatabaseHas('proyecto_sede', ['sede_id' => $tulua->id, 'proyecto_id' => $proyecto]);

        $this->assertSame(1, Sede::where('nombre', 'SERVIMERCADEO BUENAVENTURA')->count());
        $this->assertNull(Sede::where('nombre', 'SERVIMERCADEO VALLE OCCIDENTE')->sole()->id_ciudad);
        $this->assertSame(3, ProveedorWorkOrder::count());
        $this->assertSame('SERVIMERCADEO TULUA', $this->sedeExportada('WO1'));
    }

    public function test_la_migracion_usa_la_sede_si_ya_existe_aunque_tenga_tilde(): void
    {
        $existente = Sede::create(['nombre' => 'SERVIMERCADEO TULUÁ', 'tipo_sede' => 'Principal']);

        $this->correrMigracionDeRestantes();

        $this->assertSame(1, Sede::where('nombre', 'like', 'SERVIMERCADEO TUL%')->count());
        $this->assertDatabaseHas('proveedores_work_orders', ['codigo' => 'CO-I005135', 'sede_id' => $existente->id]);
        $this->assertSame('Principal', $existente->fresh()->tipo_sede);
    }

    public function test_la_migracion_respeta_una_asociacion_que_ya_exista(): void
    {
        $cali = Sede::create(['nombre' => 'SERVIMERCADEO CALI']);
        ProveedorWorkOrder::create(['sede_id' => $cali->id, 'codigo' => 'CO-I005135', 'nombre' => 'CO-I005135-A MANO']);

        $this->correrMigracionDeRestantes();

        $this->assertDatabaseHas('proveedores_work_orders', ['codigo' => 'CO-I005135', 'sede_id' => $cali->id, 'nombre' => 'CO-I005135-A MANO']);
        $this->assertDatabaseMissing('sedes', ['nombre' => 'SERVIMERCADEO TULUA']);
    }

    public function test_la_migracion_asocia_por_nombre_y_no_crea_sedes_para_proveedores_desconocidos(): void
    {
        $bogota = Sede::create(['nombre' => 'SERVIMERCADEO BOGOTA']);
        $this->crearWo('WO1', 'CO-I009999-SERVIMERCADEO BOGOTA');
        $this->crearWo('WO2', 'CO-I009998-SERVIMERCADEO DESCONOCIDA');
        $this->crearWo('WO3', 'DIRECTV');

        $this->correrMigracionDeRestantes();

        $this->assertDatabaseHas('proveedores_work_orders', ['codigo' => 'CO-I009999', 'sede_id' => $bogota->id]);
        $this->assertDatabaseMissing('proveedores_work_orders', ['codigo' => 'CO-I009998']);
        $this->assertDatabaseMissing('proveedores_work_orders', ['codigo' => 'DIRECTV']);
        $this->assertDatabaseMissing('sedes', ['nombre' => 'SERVIMERCADEO DESCONOCIDA']);
    }

    public function test_la_migracion_no_hace_nada_en_una_base_sin_sedes(): void
    {
        $this->crearWo('WO1', 'CO-I005135-SERVIMERCADEO TULUA');

        $this->correrMigracionDeRestantes();

        $this->assertSame(0, Sede::count());
        $this->assertSame(0, ProveedorWorkOrder::count());
    }

    private function correrMigracionDePereiraYValle(): void
    {
        $migracion = require database_path('migrations/2026_11_02_000004_asociar_co_i005115_a_pereira_y_ciudad_valle_occidente.php');
        $migracion->up();
    }

    public function test_co_i005115_queda_en_pereira_junto_con_el_proveedor_que_ya_tenia(): void
    {
        $pereira = Sede::create(['nombre' => 'SERVIMERCADEO PEREIRA']);
        ProveedorWorkOrder::create(['sede_id' => $pereira->id, 'codigo' => 'CO-I004174', 'nombre' => 'CO-I004174-SERVIMERCADEO PEREIRA']);
        $this->crearWo('WO1', 'CO-I005115-SERVIMERCADEO ALGUNA CIUDAD');

        $this->correrMigracionDePereiraYValle();
        $this->correrMigracionDePereiraYValle();

        $this->assertSame(2, ProveedorWorkOrder::where('sede_id', $pereira->id)->count());
        $this->assertSame('SERVIMERCADEO PEREIRA', $this->sedeExportada('WO1'));
    }

    public function test_valle_occidente_queda_en_buenaventura_sin_pisar_una_ciudad_ya_puesta(): void
    {
        DB::table('ciudades')->insert([
            ['id' => 1009, 'nombre' => 'Buenaventura', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 1038, 'nombre' => 'Tuluá', 'created_at' => now(), 'updated_at' => now()],
        ]);
        $valle = Sede::create(['nombre' => 'SERVIMERCADEO VALLE OCCIDENTE']);

        $this->correrMigracionDePereiraYValle();
        $this->assertSame(1009, $valle->fresh()->id_ciudad);

        $valle->update(['id_ciudad' => 1038]);
        $this->correrMigracionDePereiraYValle();
        $this->assertSame(1038, $valle->fresh()->id_ciudad);
    }

    public function test_la_migracion_de_pereira_no_falla_en_una_base_sin_sedes(): void
    {
        $this->correrMigracionDePereiraYValle();

        $this->assertSame(0, ProveedorWorkOrder::count());
    }
}
