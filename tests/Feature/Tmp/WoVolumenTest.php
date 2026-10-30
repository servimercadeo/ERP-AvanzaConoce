<?php
namespace Tests\Feature\Tmp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ErpFixtures;
use Tests\TestCase;
class WoVolumenTest extends TestCase
{
    use RefreshDatabase, ErpFixtures;
    public function test_volumen(): void
    {
        $this->actuarComo('admin');
        foreach ([5000, 20000] as $n) {
            $items = [];
            for ($i = 0; $i < $n; $i++) {
                $items[] = ['numero_wo' => "V{$n}-{$i}", 'estado' => 'Finalizado', 'cedula_tecnico' => (string) (1000000 + $i % 50),
                    'nombre_tecnico' => 'TECNICO ' . ($i % 50), 'servicio' => 'INSTALACION', 'proveedor' => 'SERVIMERCADEO', 'direccion' => "CALLE $i",
                    'fecha_finalizacion' => '2026-10-01 10:00', 'municipio' => 'PEREIRA', 'departamento' => 'RISARALDA', 'tipo_orden' => 'RESIDENCIAL'];
            }
            $bytes = strlen(json_encode(['items' => $items]));
            $t = microtime(true);
            $r = $this->postJson('/api/work-orders/importar', ['items' => $items]);
            fwrite(STDERR, sprintf("\n  N=%d: HTTP %d, %.1f s, cuerpo %.1f MB, memoria pico %.0f MB, %s\n", $n, $r->status(), microtime(true) - $t, $bytes / 1048576, memory_get_peak_usage(true) / 1048576, substr($r->getContent(), 0, 120)));
        }
        $this->assertTrue(true);
    }
}
