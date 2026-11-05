<?php

use App\Models\PermisoDenegado;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Los aliados (aliado empresa, técnico de aliado empresa y aliado / técnico indirecto) no
     * ven Inventarios ni los pedidos de la empresa, pero sí crean pedidos y ven solo los suyos.
     *  - pedidos_compra.registrado_por_id: quién lo creó (antes solo el nombre en `registra`).
     *  - pedidos_compra.aliado_id: el aliado del pedido (responsable tipo Aliado).
     *  - Matriz: a los 3 perfiles se les niega todo Inventarios, Compras y Asignación de
     *    Pedidos; en Pedidos solo pueden ver y crear (editar, eliminar y exportar negados).
     *    Desde Permisos se puede cambiar.
     */
    private const CATEGORIAS_CON_MODULO_PROPIO = ['Activos', 'Materiales', 'Equipos', 'Dotación', 'EPP', 'Herramientas'];
    private const INVENTARIOS = ['dotacion', 'inv_activos', 'inv_materiales', 'inv_equipos', 'inv_epp', 'inv_herramientas', 'inv_general', 'asignacion_inventario', 'inventario_empleado'];

    public function up(): void
    {
        Schema::table('pedidos_compra', function (Blueprint $table) {
            if (!Schema::hasColumn('pedidos_compra', 'registrado_por_id')) {
                $table->foreignId('registrado_por_id')->nullable()->after('registra')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('pedidos_compra', 'aliado_id')) {
                $table->foreignId('aliado_id')->nullable()->after('empresa_id')->constrained('aliados')->nullOnDelete();
            }
        });

        // Pedidos viejos de tipo Aliado cuyo responsable es un aliado real: se enlazan por nombre.
        foreach (DB::table('aliados')->get(['id', 'nombre']) as $aliado) {
            DB::table('pedidos_compra')->where('tipo_responsable', 'Aliado')->whereNull('aliado_id')
                ->whereRaw('UPPER(TRIM(responsable)) = ?', [mb_strtoupper(trim($aliado->nombre), 'UTF-8')])
                ->update(['aliado_id' => $aliado->id]);
        }

        $slug = fn (string $n) => trim(preg_replace('/[^a-z0-9]+/', '_', mb_strtolower(Str::ascii($n))), '_');
        $inventarios = self::INVENTARIOS;
        foreach (DB::table('categorias_producto')->pluck('nombre') as $nombre) {
            if (!in_array($nombre, self::CATEGORIAS_CON_MODULO_PROPIO, true)) {
                $inventarios[] = 'inv_' . ($slug($nombre) ?: 'categoria');
            }
        }

        $now = now();
        foreach (PermisoDenegado::PERFILES_DE_ALIADOS as $perfil) {
            DB::table('permisos_denegados')->where('rol', $perfil)->whereIn('modulo_id', ['inventarios', 'pedidos_compras'])->delete();
            $filas = [];
            $fila = fn (string $modulo, string $sub, string $accion = '') => [
                'rol' => $perfil, 'modulo_id' => $modulo, 'submodulo_id' => $sub, 'archivo_id' => '', 'accion' => $accion,
                'created_at' => $now, 'updated_at' => $now,
            ];
            foreach (array_unique($inventarios) as $sub) {
                $filas[] = $fila('inventarios', $sub);
            }
            $filas[] = $fila('pedidos_compras', 'compras');
            $filas[] = $fila('pedidos_compras', 'asignacion_pedidos');
            foreach (['editar', 'eliminar', 'exportar'] as $accion) {
                $filas[] = $fila('pedidos_compras', 'pedidos', $accion);
            }
            DB::table('permisos_denegados')->insert($filas);
        }
    }

    public function down(): void
    {
        Schema::table('pedidos_compra', function (Blueprint $table) {
            if (Schema::hasColumn('pedidos_compra', 'aliado_id')) {
                $table->dropConstrainedForeignId('aliado_id');
            }
            if (Schema::hasColumn('pedidos_compra', 'registrado_por_id')) {
                $table->dropConstrainedForeignId('registrado_por_id');
            }
        });
        // La matriz vuelve a la de 2026_11_01_000004 solo re-ejecutándola: aquí se deja cerrado.
        DB::table('permisos_denegados')->whereIn('rol', PermisoDenegado::PERFILES_DE_ALIADOS)
            ->where('modulo_id', 'pedidos_compras')->where('submodulo_id', 'pedidos')->delete();
        foreach (PermisoDenegado::PERFILES_DE_ALIADOS as $perfil) {
            DB::table('permisos_denegados')->insert(['rol' => $perfil, 'modulo_id' => 'pedidos_compras', 'submodulo_id' => 'pedidos',
                'archivo_id' => '', 'accion' => '', 'created_at' => now(), 'updated_at' => now()]);
        }
    }
};
