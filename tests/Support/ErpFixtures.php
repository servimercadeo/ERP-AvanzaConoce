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

    /**
     * Datos de un pedido de dotación manual con su sede (obligatoria): la de su primera prenda,
     * como la elegiría quien lo crea. Sin prendas, cualquier sede.
     */
    protected function conSede(array $datos): array
    {
        if (array_key_exists('sede_id', $datos)) {
            return $datos;
        }
        $primera = $datos['items'][0]['inventario_dotacion_id'] ?? null;
        $sede = $primera ? DB::table('inventario_dotacion')->where('id', $primera)->value('sede_id') : null;

        return $datos + ['sede_id' => $sede ?? DB::table('sedes')->value('id') ?? $this->sede()];
    }

    protected function usuario(string $rol = 'general', array $atributos = []): User
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

    /**
     * Fila válida en una tabla con muchas columnas obligatorias (formulario de ingreso,
     * candidatos): lo que no se indica se rellena según el tipo de la columna.
     */
    protected function filaCompleta(string $tabla, array $datos): void
    {
        $columnas = DB::select(
            'select column_name c, data_type t, column_type ct from information_schema.columns
             where table_schema = database() and table_name = ? and is_nullable = ? and column_default is null and extra not like ?',
            [DB::getTablePrefix() . $tabla, 'NO', '%auto_increment%'],
        );
        foreach ($columnas as $col) {
            $datos[$col->c] ??= match (true) {
                str_contains($col->t, 'date') || str_contains($col->t, 'time') => '2000-01-01',
                str_contains($col->t, 'int') || in_array($col->t, ['decimal', 'double', 'float'], true) => 0,
                $col->t === 'enum' => explode("'", $col->ct)[1],
                default => '1',
            };
        }
        DB::table($tabla)->insert($datos);
    }

    /** Formulario de ingreso diligenciado por esa cédula (de ahí salen las tallas). */
    protected function formularioIngreso(string $cedula, array $tallas = []): void
    {
        $this->filaCompleta('respuestas_ingresos', $tallas + [
            'documento' => $cedula, 'talla_camisa' => 'M', 'talla_pantalon' => '32', 'talla_zapatos' => '40',
            'created_at' => now(), 'updated_at' => now(),
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
