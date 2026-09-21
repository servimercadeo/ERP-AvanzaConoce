<?php

namespace Tests\Support;

use App\Models\InventarioProducto;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Helpers para armar datos de prueba. Las migraciones ya siembran catálogos (categorías,
 * tipos de producto, proveedores, proyectos...), así que los helpers crean filas con
 * nombres únicos en vez de asumir tablas vacías.
 */
trait ErpFixtures
{
    private int $seq = 0;

    protected function unico(string $prefijo = 'X'): string
    {
        return $prefijo . '-' . uniqid() . '-' . (++$this->seq);
    }

    protected function usuario(string $rol = 'consultor', array $atributos = []): User
    {
        $user = User::factory()->create(array_merge(['activo' => true], $atributos));
        // El rol se fuerza directo para no pasar por el hook que lo deriva del cargo.
        $user->forceFill(['rol' => $rol])->saveQuietly();

        return $user->fresh();
    }

    protected function actuarComo(string $rol = 'admin', array $atributos = []): User
    {
        $user = $this->usuario($rol, $atributos);
        $this->actingAs($user);

        return $user;
    }

    protected function sede(?string $nombre = null): int
    {
        return DB::table('sedes')->insertGetId([
            'nombre'     => $nombre ?? $this->unico('SEDE'),
            'estado'     => 'Activa',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function tipoProducto(?string $nombre = null, string $categoria = 'Materiales'): int
    {
        return DB::table('tipos_producto')->insertGetId([
            'nombre'     => $nombre ?? $this->unico('PROD'),
            'categoria'  => $categoria,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function inventario(int $tipoProductoId, int $sedeId, int $cantidad, array $series = [], string $talla = ''): InventarioProducto
    {
        $inv = InventarioProducto::create([
            'tipo_producto_id' => $tipoProductoId,
            'sede_id'          => $sedeId,
            'talla'            => $talla,
            'precio'           => 1000,
            'cantidad'         => $cantidad,
            'stock_minimo'     => 0,
        ]);

        foreach ($series as $serial) {
            $inv->series()->create(['serial' => $serial]);
        }

        return $inv->fresh();
    }
}
