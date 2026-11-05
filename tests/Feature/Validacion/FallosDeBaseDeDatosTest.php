<?php

namespace Tests\Feature\Validacion;

use App\Models\AsignacionInventario;
use App\Models\Auditoria;
use App\Models\InventarioProducto;
use App\Services\RevisorEsquema;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Lo que en producción aparecía como un "Server Error" sin explicación: la auditoría no tumba
 * la operación, la base responde con un mensaje claro y su estructura se puede comparar.
 */
class FallosDeBaseDeDatosTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private function datosAsignacion(): array
    {
        $this->actuarComo('general', ['name' => 'Quien Asigna']);
        $empleado = $this->usuario('general');
        $inv = $this->inventario($this->tipoProducto('GRAPA BLANCA'), $this->sede(), 200);

        return ['inventario_producto_id' => $inv->id, 'user_id' => $empleado->id, 'cantidad' => 100];
    }

    private function errorDeBase(int $codigo): QueryException
    {
        $previa = new \PDOException('simulado');
        $previa->errorInfo = ['HY000', $codigo, 'simulado'];

        return new QueryException('mysql', 'insert', [], $previa);
    }

    protected function tearDown(): void
    {
        Auditoria::flushEventListeners();
        parent::tearDown();
    }

    public function test_si_la_auditoria_falla_la_asignacion_se_guarda_y_queda_en_el_log(): void
    {
        $datos = $this->datosAsignacion();
        Log::spy();
        Auditoria::creating(function () {
            throw $this->errorDeBase(1366);
        });

        $this->postJson('/api/asignaciones-inventario', $datos)->assertCreated();

        $this->assertSame(100, InventarioProducto::find($datos['inventario_producto_id'])->cantidad);
        Log::shouldHaveReceived('error')->withArgs(fn ($m) => str_contains($m, 'No se pudo registrar la auditoría'));
    }

    public function test_un_bloqueo_mutuo_en_la_auditoria_no_deja_la_operacion_a_medias(): void
    {
        $datos = $this->datosAsignacion();
        Auditoria::creating(function () {
            throw $this->errorDeBase(1213);
        });

        $this->postJson('/api/asignaciones-inventario', $datos)->assertStatus(500);

        $this->assertSame(200, InventarioProducto::find($datos['inventario_producto_id'])->cantidad);
        $this->assertDatabaseCount('asignaciones_inventario', 0);
    }

    public function test_una_descripcion_muy_larga_se_recorta_y_se_guarda(): void
    {
        $this->actuarComo('general', ['name' => 'Quien Asigna']);
        $inv = $this->inventario($this->tipoProducto(str_repeat('X', 120)), $this->sede(), 1);
        $largo = $this->usuario('general', ['name' => str_repeat('N', 240)]);

        $this->postJson('/api/asignaciones-inventario', ['inventario_producto_id' => $inv->id, 'user_id' => $largo->id, 'cantidad' => 1])->assertCreated();
        $this->actingAs($largo);
        $inv->update(['cantidad' => 5]);

        $auditoria = Auditoria::where('modelo', InventarioProducto::class)->latest('id')->first();
        $this->assertSame(150, mb_strlen($auditoria->usuario));
    }

    public static function erroresDeDatos(): array
    {
        return [
            'carácter inválido' => [1366, 'caracteres'],
            'muy largo'         => [1406, 'demasiado largo'],
            'duplicado'         => [1062, 'Ya existe'],
            'en uso'            => [1451, 'registros relacionados'],
        ];
    }

    #[DataProvider('erroresDeDatos')]
    public function test_un_dato_que_la_base_rechaza_da_un_mensaje_claro(int $codigo, string $texto): void
    {
        $datos = $this->datosAsignacion();
        AsignacionInventario::creating(function () use ($codigo) {
            throw $this->errorDeBase($codigo);
        });

        $this->postJson('/api/asignaciones-inventario', $datos)->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, $texto));

        $this->assertSame(200, InventarioProducto::find($datos['inventario_producto_id'])->cantidad, 'La operación se revierte.');
    }

    public function test_otro_error_de_base_sigue_siendo_un_500(): void
    {
        $datos = $this->datosAsignacion();
        AsignacionInventario::creating(function () {
            throw $this->errorDeBase(1146);
        });

        $this->postJson('/api/asignaciones-inventario', $datos)->assertStatus(500);
    }

    // ── Estructura esperada ──────────────────────────────────────────────────

    /** Para actualizarlo tras una migración: ACTUALIZAR_ESQUEMA=1 php vendor/bin/phpunit --filter el_archivo */
    public function test_el_archivo_de_estructura_coincide_con_las_migraciones(): void
    {
        $actual = RevisorEsquema::leerActual();
        $ruta = base_path(RevisorEsquema::ARCHIVO);

        if (getenv('ACTUALIZAR_ESQUEMA')) {
            $this->assertSame('', \Illuminate\Support\Facades\DB::getTablePrefix());
            $this->assertStringEndsWith('_test', \Illuminate\Support\Facades\DB::getDatabaseName());
            file_put_contents($ruta, json_encode($actual, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL);
        }

        $esperado = json_decode((string) file_get_contents($ruta), true);
        $this->assertSame(
            ['errores' => [], 'avisos' => []],
            RevisorEsquema::comparar($esperado, $actual),
            'Cambió una migración: actualiza el archivo (ver el comentario de esta prueba).',
        );
        $this->assertSame([], array_values(array_diff(array_keys($actual), array_keys($esperado))), 'Tablas nuevas sin registrar en el archivo.');
    }

    public function test_el_comando_corre_sin_errores_en_una_base_al_dia(): void
    {
        $this->artisan('erp:revisar-bd')->assertSuccessful();
    }

    private function columna(string $tipo = 'varchar(50)', bool $nulo = true, bool $porDefecto = false, ?string $charset = 'utf8mb4'): array
    {
        return ['tipo' => $tipo, 'nulo' => $nulo, 'por_defecto' => $porDefecto, 'charset' => $charset];
    }

    public static function diferencias(): array
    {
        return [
            'columna faltante'        => [[], 'falta la columna'],
            'texto más corto'         => [['c' => ['tipo' => 'varchar(10)', 'nulo' => true, 'por_defecto' => false, 'charset' => 'utf8mb4']], 'los textos largos'],
            'tipo distinto'           => [['c' => ['tipo' => 'int', 'nulo' => true, 'por_defecto' => false, 'charset' => null]], 'tiene int'],
            'obligatoria sin defecto' => [['c' => ['tipo' => 'varchar(50)', 'nulo' => false, 'por_defecto' => false, 'charset' => 'utf8mb4']], 'obligatoria'],
        ];
    }

    #[DataProvider('diferencias')]
    public function test_detecta_las_diferencias_que_causan_errores(array $columnasReales, string $texto): void
    {
        $r = RevisorEsquema::comparar(['t' => ['c' => $this->columna()]], ['t' => $columnasReales]);

        $this->assertStringContainsString($texto, implode(' ', $r['errores']));
    }

    public function test_detecta_una_tabla_faltante_y_el_caso_de_produccion_con_latin1(): void
    {
        $this->assertSame(['Falta la tabla t.'], RevisorEsquema::comparar(['t' => []], [])['errores']);

        $r = RevisorEsquema::comparar(['t' => ['c' => $this->columna()]], ['t' => ['c' => $this->columna(charset: 'latin1')]]);
        $this->assertSame([], $r['errores']);
        $this->assertStringContainsString('latin1', $r['avisos'][0]);
    }

    public function test_acepta_las_diferencias_que_no_afectan(): void
    {
        $r = RevisorEsquema::comparar(
            ['t' => ['n' => $this->columna('bigint', false, true, null), 'j' => $this->columna('longtext'), 'c' => $this->columna()]],
            ['t' => [
                'n' => $this->columna(RevisorEsquema::normalizarTipo('bigint(20)'), false, true, null),
                'j' => $this->columna(RevisorEsquema::normalizarTipo('json'), charset: null),
                'c' => $this->columna('varchar(255)'),
                'extra' => $this->columna('varchar(5)'),
            ]],
        );

        $this->assertSame(['errores' => [], 'avisos' => []], $r);
    }
}
