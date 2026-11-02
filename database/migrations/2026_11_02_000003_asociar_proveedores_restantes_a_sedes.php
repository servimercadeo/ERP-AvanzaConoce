<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Proveedores sin sede con su nombre ni con su "Código C.I": código => [sede, ciudad].
    private const SEDES_FALTANTES = [
        'CO-I005135' => ['SERVIMERCADEO TULUA', 'Tuluá'],
        'CO-I005075' => ['SERVIMERCADEO BUENAVENTURA', 'Buenaventura'],
        // Sus WO son de El Charco y Buenaventura: la ciudad la pone la migración 000004.
        'CO-I005299' => ['SERVIMERCADEO VALLE OCCIDENTE', null],
    ];

    public function up(): void
    {
        // BD recién instalada: SedesSeeder vacía `sedes` después de migrar y dejaría esto suelto.
        if (!DB::table('sedes')->exists()) {
            return;
        }

        $this->asociarPorNombreDeSede();
        $this->crearSedesFaltantes();
    }

    public function down(): void
    {
        // Las sedes se quedan: para entonces pueden tener contratos o inventario.
        DB::table('proveedores_work_orders')->whereIn('codigo', array_keys(self::SEDES_FALTANTES))->delete();
    }

    private function asociarPorNombreDeSede(): void
    {
        $proveedores = DB::table('work_orders')->where('proveedor', '!=', '')->distinct()->pluck('proveedor');

        foreach ($proveedores as $proveedor) {
            if (!preg_match('/^(CO-I\d+)-(.+)$/iu', trim($proveedor), $partes)) {
                continue;
            }

            $sedeId = DB::table('sedes')->where('nombre', trim($partes[2]))->value('id');
            if ($sedeId) {
                $this->asociar(mb_strtoupper($partes[1], 'UTF-8'), $proveedor, $sedeId);
            }
        }
    }

    private function crearSedesFaltantes(): void
    {
        foreach (self::SEDES_FALTANTES as $codigo => [$nombre, $ciudad]) {
            if (DB::table('proveedores_work_orders')->where('codigo', $codigo)->exists()) {
                continue;
            }

            $sedeId = DB::table('sedes')->where('nombre', $nombre)->value('id')
                ?? $this->crearSede($codigo, $nombre, $ciudad);

            $this->asociar($codigo, "{$codigo}-{$nombre}", $sedeId);
        }
    }

    private function crearSede(string $codigo, string $nombre, ?string $ciudad): int
    {
        $proyectoId = DB::table('proyectos')->where('nombre', 'DIRECTV')->value('id');

        $sedeId = DB::table('sedes')->insertGetId([
            'nombre' => $nombre,
            'id_ciudad' => $ciudad ? DB::table('ciudades')->where('nombre', $ciudad)->value('id') : null,
            'regional_id' => DB::table('regionales')->where('nombre', 'OCCIDENTE')->value('id'),
            'proyecto_id' => $proyectoId,
            'estado' => 'Activa',
            'tipo_sede' => 'Punto de Venta',
            'codigo_instalador' => $codigo,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Dotación e inventario ubican las sedes de un proyecto por este pivote, no por proyecto_id.
        if ($proyectoId) {
            DB::table('proyecto_sede')->insert([
                'proyecto_id' => $proyectoId, 'sede_id' => $sedeId,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        return $sedeId;
    }

    private function asociar(string $codigo, string $nombre, int $sedeId): void
    {
        // insertOrIgnore: una asociación que ya exista (por código o a mano) no se pisa.
        DB::table('proveedores_work_orders')->insertOrIgnore([
            'sede_id' => $sedeId, 'codigo' => $codigo, 'nombre' => $nombre,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }
};
