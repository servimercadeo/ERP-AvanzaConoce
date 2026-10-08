<?php

namespace Tests\Feature\Contratos;

use App\Services\CredencialesAvanzaConoce;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Alta de empleados: si la persona ya existe en AvanzaConoce (misma base, `nit` = cédula),
 * el ERP usa su misma contraseña; si no, genera una temporal.
 */
class CredencialesAvanzaConoceTest extends TestCase
{
    use RefreshDatabase;

    private string $hashAvanza;

    protected function setUp(): void
    {
        parent::setUp();

        // Tabla temporal que hace de `users` de AvanzaConoce (no rompe la transacción del test).
        DB::statement('CREATE TEMPORARY TABLE avanza_users_test (nit BIGINT, password VARCHAR(255))');
        $this->hashAvanza = Hash::make('ClaveDeAvanza1');
        DB::table('avanza_users_test')->insert(['nit' => 123456789, 'password' => $this->hashAvanza]);
        config(['sso.avanzaconoce_users_table' => 'avanza_users_test']);
    }

    /** Simula producción: entorno production y tablas del ERP con prefijo. */
    private function enProduccion(callable $fn): mixed
    {
        $entorno = $this->app['env'];
        $conexion = DB::connection();
        $prefijo = $conexion->getTablePrefix();
        $this->app['env'] = 'production';
        $conexion->setTablePrefix('erp_');

        try {
            return $fn();
        } finally {
            $conexion->setTablePrefix($prefijo);
            $this->app['env'] = $entorno;
        }
    }

    public function test_si_existe_en_avanza_usa_su_misma_contrasena(): void
    {
        $credenciales = $this->enProduccion(fn () => CredencialesAvanzaConoce::paraAlta('123456789'));

        $this->assertTrue($credenciales['de_avanza']);
        $this->assertSame($this->hashAvanza, $credenciales['hash']);
        $this->assertTrue(Hash::check('ClaveDeAvanza1', $credenciales['hash']));
        $this->assertSame(CredencialesAvanzaConoce::MISMA_DE_AVANZA, $credenciales['mostrar']);
    }

    public function test_si_no_existe_en_avanza_genera_una_temporal(): void
    {
        $credenciales = $this->enProduccion(fn () => CredencialesAvanzaConoce::paraAlta('999999999'));

        $this->assertFalse($credenciales['de_avanza']);
        $this->assertSame(10, strlen($credenciales['mostrar']));
        $this->assertTrue(Hash::check($credenciales['mostrar'], $credenciales['hash']));
    }

    public function test_fuera_de_produccion_no_consulta_avanza(): void
    {
        $credenciales = CredencialesAvanzaConoce::paraAlta('123456789');

        $this->assertFalse($credenciales['de_avanza']);
    }

    public function test_solo_acepta_contrasenas_bcrypt(): void
    {
        DB::table('avanza_users_test')->insert(['nit' => 555, 'password' => '$argon2id$v=19$otra']);

        $credenciales = $this->enProduccion(fn () => CredencialesAvanzaConoce::paraAlta('555'));

        $this->assertFalse($credenciales['de_avanza']);
    }
}
