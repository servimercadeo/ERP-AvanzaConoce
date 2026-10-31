<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * La matriz de Permisos tiene una pestaña por cada tipo de aliado, para decidir a mano qué
     * ve cada uno (ver PermisoDenegado::perfilDe). Antes eso estaba fijo en el código:
     *  - aliado:            usuario de un aliado empresa (rol `aliado`).
     *  - tecnico_aliado:    técnico de un aliado empresa (rol `tecnico` + aliado empresa).
     *  - tecnico_indirecto: aliado / técnico indirecto (rol `tecnico` + aliado tipo técnico).
     * El rol `tecnico` sin aliado queda como el técnico directo.
     *
     * Arrancan con lo que veían hasta hoy, para que nada cambie al desplegar:
     *  - aliado: solo Operaciones > Aliados (su ficha), sin crear, editar ni eliminar.
     *  - técnicos de aliados: lo mismo que el técnico directo, menos Work Orders (sus WO las
     *    ven en la ficha de su aliado: Operaciones > Aliados, sin crear, editar ni eliminar).
     */
    private const PERFILES = ['aliado', 'tecnico_aliado', 'tecnico_indirecto'];

    /** Submódulos fijos del menú (resources/js/data/erpModules.js); `_modulo` = archivos del módulo. */
    private const SUBMODULOS = [
        'sedes'           => ['_modulo'],
        'administrativo'  => ['empleados', 'seleccion', 'admin_contratos'],
        'inventarios'     => ['dotacion', 'inv_activos', 'inv_materiales', 'inv_equipos', 'inv_epp', 'inv_herramientas', 'inv_general', 'asignacion_inventario', 'inventario_empleado'],
        'operaciones'     => ['work_orders', 'aliados'],
        'pedidos_compras' => ['pedidos', 'compras', 'asignacion_pedidos'],
        'parametros'      => ['empleadores', 'empresas', 'regionales', 'centros_costos', 'proyectos', 'cargos', 'clases_pedido', 'conceptos_pedido', 'categoria_producto', 'proveedores', '_modulo'],
        'permisos'        => ['roles_permisos', 'auditoria'],
    ];

    /** Categorías de inventario con submódulo propio (no generan uno automático; useErpModules.js). */
    private const CATEGORIAS_CON_MODULO_PROPIO = ['Activos', 'Materiales', 'Equipos', 'Dotación', 'EPP', 'Herramientas'];

    private const ACCIONES_FICHA = ['crear', 'editar', 'eliminar'];

    public function up(): void
    {
        $prefix = DB::getTablePrefix();
        DB::statement("ALTER TABLE `{$prefix}permisos_denegados` MODIFY rol ENUM('th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general', 'tecnico', 'aliado', 'tecnico_aliado', 'tecnico_indirecto') NOT NULL");

        DB::table('permisos_denegados')->whereIn('rol', self::PERFILES)->delete();
        $now = now();
        $filas = [];
        $fila = fn (string $rol, string $modulo, string $sub, string $accion = '') => [
            'rol' => $rol, 'modulo_id' => $modulo, 'submodulo_id' => $sub, 'archivo_id' => '', 'accion' => $accion,
            'created_at' => $now, 'updated_at' => $now,
        ];

        // Aliado empresa: todo cerrado menos su ficha (también los submódulos que hoy existen
        // por datos: categorías de inventario y tipos de parámetro).
        foreach ($this->todosLosSubmodulos() as [$modulo, $sub]) {
            if (!($modulo === 'operaciones' && $sub === 'aliados')) {
                $filas[] = $fila('aliado', $modulo, $sub);
            }
        }
        foreach (self::ACCIONES_FICHA as $accion) {
            $filas[] = $fila('aliado', 'operaciones', 'aliados', $accion);
        }

        // Técnicos de aliados: lo del técnico directo, sin Work Orders y con su ficha (solo verla).
        $delTecnico = DB::table('permisos_denegados')->where('rol', 'tecnico')
            ->where(fn ($q) => $q->where('modulo_id', '!=', 'operaciones')->orWhereNotIn('submodulo_id', ['work_orders', 'aliados']))
            ->get(['modulo_id', 'submodulo_id', 'archivo_id', 'accion']);
        foreach (['tecnico_aliado', 'tecnico_indirecto'] as $perfil) {
            foreach ($delTecnico as $r) {
                $filas[] = ['rol' => $perfil, 'modulo_id' => $r->modulo_id, 'submodulo_id' => $r->submodulo_id,
                    'archivo_id' => (string) $r->archivo_id, 'accion' => (string) $r->accion, 'created_at' => $now, 'updated_at' => $now];
            }
            $filas[] = $fila($perfil, 'operaciones', 'work_orders');
            foreach (self::ACCIONES_FICHA as $accion) {
                $filas[] = $fila($perfil, 'operaciones', 'aliados', $accion);
            }
        }

        foreach (array_chunk($filas, 500) as $lote) {
            DB::table('permisos_denegados')->insert($lote);
        }
    }

    public function down(): void
    {
        DB::table('permisos_denegados')->whereIn('rol', self::PERFILES)->delete();
        $prefix = DB::getTablePrefix();
        DB::statement("ALTER TABLE `{$prefix}permisos_denegados` MODIFY rol ENUM('th', 'tic', 'operaciones', 'financiera', 'supervisores', 'general', 'tecnico') NOT NULL");
    }

    /** [módulo, submódulo] de todo el menú, incluidos los que arma useErpModules.js con datos. */
    private function todosLosSubmodulos(): array
    {
        $lista = [];
        foreach (self::SUBMODULOS as $modulo => $subs) {
            foreach ($subs as $sub) {
                $lista[] = [$modulo, $sub];
            }
        }

        $slug = fn (string $nombre) => trim(preg_replace('/[^a-z0-9]+/', '_', mb_strtolower(Str::ascii($nombre))), '_');

        foreach (DB::table('categorias_producto')->pluck('nombre') as $nombre) {
            if (!in_array($nombre, self::CATEGORIAS_CON_MODULO_PROPIO, true)) {
                $lista[] = ['inventarios', 'inv_' . ($slug($nombre) ?: 'categoria')];
            }
        }
        foreach (DB::table('tipos_parametro')->get(['id', 'grupo']) as $tipo) {
            $grupo = trim((string) $tipo->grupo);
            $lista[] = ['parametros', $grupo === '' ? "param_{$tipo->id}" : 'paramgrupo_' . ($slug($grupo) ?: 'categoria')];
        }

        return array_values(array_unique($lista, SORT_REGULAR));
    }
};
