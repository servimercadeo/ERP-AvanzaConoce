<?php

namespace Tests\Feature\Contratos;

use App\Models\Contrato;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\ErpFixtures;
use Tests\TestCase;

/**
 * Reingreso: quien ya tuvo contrato (por ejemplo, aprendiz SENA) se vuelve a contratar desde
 * Contratos, sin pasar por Selección. El contrato viejo no se toca: se crea uno nuevo a nombre de
 * la misma persona. Puede tener varios contratos, pero solo uno activo.
 */
class ReingresoTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;

    private const URL_ESTADO = 'https://avanza.test/api/erp/empleados/estado';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        config([
            'sso.crear_usuarios_en_avanza' => true,
            'sso.avanzaconoce_api_url'     => 'https://avanza.test/',
            'sso.secret'                   => 'secreto-compartido',
        ]);
        Http::fake(['*' => Http::response(['actualizado' => true], 200)]);
        $this->actuarComo('th');
    }

    private function empleado(array $atributos = []): User
    {
        return $this->usuario('general', array_merge([
            'cedula' => '9100', 'estado_empleado' => 'Activo', 'pendiente_alta' => false,
            'nombres' => 'LUIS', 'apellidos' => 'ROJAS', 'genero' => 'Masculino',
        ], $atributos));
    }

    private function datos(User $empleado, array $extra = []): array
    {
        return array_merge([
            'empleado_id' => $empleado->id, 'tipo_contrato' => 'Aprendizaje', 'cargo' => 'APRENDIZ SENA', 'sede' => 'SEDE X',
            'fecha_ingreso' => '2025-01-01', 'estado_contrato' => 'Vigente', 'empresa' => 'ALTYCOM', 'cliente_proyecto' => 'HUGHES COL',
        ], $extra);
    }

    /** Contrato SENA ya finalizado: la persona quedó Inactiva. */
    private function aprendizQueTermino(array $atributos = []): array
    {
        $empleado = $this->empleado($atributos);
        $id = $this->postJson('/api/contratos', $this->datos($empleado))->assertCreated()->json('id');
        $this->putJson("/api/contratos/{$id}", $this->datos($empleado, [
            'estado_contrato' => 'Finalizado', 'motivo_finalizacion' => 'Terminación', 'fecha_retiro' => '2025-12-31',
        ]))->assertOk();
        $this->assertFalse((bool) $empleado->fresh()->activo, 'Al terminar el SENA queda inactivo.');

        return [$empleado, $id];
    }

    private function enviadoAAvanza(string $estado): bool
    {
        return Http::recorded(fn (Request $r) => $r->url() === self::URL_ESTADO && $r['cedula'] === '9100' && $r['estado'] === $estado)->isNotEmpty();
    }

    public function test_el_reingreso_crea_un_contrato_nuevo_para_la_misma_persona_sin_tocar_el_viejo(): void
    {
        [$empleado, $viejo] = $this->aprendizQueTermino();
        $campos = ['estado_contrato', 'cargo', 'fecha_ingreso', 'fecha_retiro', 'motivo_finalizacion'];
        $antes = Contrato::find($viejo)->only($campos);

        $r = $this->postJson('/api/contratos', $this->datos($empleado, [
            'tipo_contrato' => 'Indefinido', 'cargo' => 'DESARROLLADOR DE SOFTWARE SENIOR', 'fecha_ingreso' => '2026-11-10',
        ]))->assertCreated()->assertJsonPath('reingreso', true)->assertJsonPath('empleado_id', $empleado->id);

        $this->assertNotSame($viejo, $r->json('id'));
        $this->assertEquals($antes, Contrato::find($viejo)->only($campos), 'El contrato viejo queda igual.');
        $this->assertSame('Finalizado', Contrato::find($viejo)->estado_contrato);
        $this->assertSame(2, Contrato::where('empleado_id', $empleado->id)->count());
        $this->assertSame(1, User::where('cedula', '9100')->count(), 'Sigue siendo la misma persona.');
    }

    public function test_el_reingreso_le_devuelve_el_acceso_en_el_erp_y_en_avanzaconoce(): void
    {
        [$empleado] = $this->aprendizQueTermino();

        $this->postJson('/api/contratos', $this->datos($empleado, ['fecha_ingreso' => '2026-11-10']))->assertCreated();

        $empleado->refresh();
        $this->assertTrue((bool) $empleado->activo);
        $this->assertSame('Activo', $empleado->estado_empleado);
        $this->assertTrue($this->enviadoAAvanza('Activo'));
    }

    public function test_un_reingreso_historico_finalizado_no_devuelve_el_acceso(): void
    {
        [$empleado] = $this->aprendizQueTermino();

        $this->postJson('/api/contratos', $this->datos($empleado, ['fecha_ingreso' => '2024-01-01', 'estado_contrato' => 'Finalizado', 'motivo_finalizacion' => 'Voluntario']))
            ->assertCreated();

        $this->assertFalse((bool) $empleado->fresh()->activo);
    }

    public static function estadosActivos(): array
    {
        return [['Vigente'], ['Traslado']];
    }

    #[DataProvider('estadosActivos')]
    public function test_con_un_contrato_activo_no_se_crea_otro_activo(string $estado): void
    {
        $empleado = $this->empleado();
        $this->postJson('/api/contratos', $this->datos($empleado, ['estado_contrato' => $estado]))->assertCreated();

        $this->postJson('/api/contratos', $this->datos($empleado, ['fecha_ingreso' => '2026-11-10']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('empleado_id')
            ->assertJsonPath('errors.empleado_id.0', fn ($m) => str_contains($m, 'ya tiene un contrato vigente') && str_contains($m, 'Finalízalo'));

        $this->assertSame(1, Contrato::where('empleado_id', $empleado->id)->count());
    }

    public function test_con_un_contrato_activo_si_se_puede_cargar_un_historico(): void
    {
        $empleado = $this->empleado();
        $this->postJson('/api/contratos', $this->datos($empleado))->assertCreated();

        $this->postJson('/api/contratos', $this->datos($empleado, ['fecha_ingreso' => '2020-01-01', 'estado_contrato' => 'Finalizado', 'motivo_finalizacion' => 'Voluntario']))
            ->assertCreated()->assertJsonPath('reingreso', true);
    }

    public function test_un_primer_contrato_no_es_reingreso(): void
    {
        $this->postJson('/api/contratos', $this->datos($this->empleado()))->assertCreated()->assertJsonPath('reingreso', false);
    }

    public function test_quien_aun_no_tiene_el_alta_no_recibe_acceso_por_el_reingreso(): void
    {
        [$empleado] = $this->aprendizQueTermino();
        $empleado->forceFill(['pendiente_alta' => true])->saveQuietly();

        $this->postJson('/api/contratos', $this->datos($empleado, ['fecha_ingreso' => '2026-11-10']))->assertCreated();

        $this->assertFalse((bool) $empleado->fresh()->activo, 'El acceso lo da el alta en Empleados.');
    }

    public function test_un_contrato_anulado_no_cuenta_como_activo(): void
    {
        $empleado = $this->empleado();
        Contrato::create($this->datos($empleado, ['completado' => false]));

        $this->postJson('/api/contratos', $this->datos($empleado, ['fecha_ingreso' => '2026-11-10']))->assertCreated();
    }
}
