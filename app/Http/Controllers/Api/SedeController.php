<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProveedorWorkOrder;
use App\Models\Sede;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SedeController extends Controller
{
    public function index(Request $request)
    {
        $query = Sede::query();

        // Obtener la ciudad y el departamento (usando la tabla ciudades)
        // Para simplificar, obtenemos las sedes y luego hacemos map en el frontend,
        // o podemos hacer join aquí para traer el nombre de la ciudad.
        $query->leftJoin('ciudades', 'sedes.id_ciudad', '=', 'ciudades.id')
              ->select('sedes.*', 'ciudades.nombre as ciudad_nombre', 'ciudades.id_departamento');

        if ($request->search) {
            $s = $request->search;
            // Agrupado: sin el closure, el orWhere se mezclaba con los filtros de estado/tipo/ciudad
            // de abajo ("nombre LIKE x OR (codigo LIKE x AND estado = y)") y dejaba pasar sedes
            // que no cumplían el filtro.
            $query->where(function ($q) use ($s) {
                $q->where('sedes.nombre', 'like', "%$s%")
                  ->orWhere('sedes.codigo_distribuidor', 'like', "%$s%");
            });
        }

        if ($request->estado && $request->estado !== 'Todos') {
            $query->where('sedes.estado', $request->estado);
        }

        if ($request->tipo_sede && $request->tipo_sede !== 'Todos') {
            $query->where('sedes.tipo_sede', $request->tipo_sede);
        }

        if ($request->id_ciudad && $request->id_ciudad !== 'Todas') {
            $query->where('sedes.id_ciudad', $request->id_ciudad);
        }

        $sedes = $query->orderBy('sedes.created_at', 'desc')->get();

        // Cargar relaciones
        $sedes->load(['padre', 'almacenista', 'secretaria', 'jefe', 'regional', 'proyecto', 'proveedoresWorkOrders']);

        return response()->json($sedes);
    }

    public function options()
    {
        // Usuarios
        $users = User::select('id', 'name', 'email', 'nombres', 'apellidos')->get()->map(function($u) {
            $nombre_completo = trim(($u->apellidos ?? '') . ' ' . ($u->nombres ?? ''));
            if (!$nombre_completo) $nombre_completo = $u->name;
            return [
                'id' => $u->id,
                'label' => $nombre_completo . ' (' . $u->email . ')'
            ];
        });

        // Ciudades y Departamentos (simulados si no hay tabla departamentos)
        $ciudades = DB::table('ciudades')->select('id', 'nombre', 'id_departamento')->orderBy('nombre')->get();
        
        // Agrupar ciudades por ID de departamento para facilitar el filtrado en frontend
        // Como no tenemos tabla de departamentos, simplemente listaremos las ciudades.

        // Sedes (para sede padre)
        $sedes = Sede::select('id', 'nombre')->orderBy('nombre')->get();

        // Regionales
        $regionales = DB::table('regionales')->select('id', 'nombre')->orderBy('nombre')->get();

        // Proyectos
        $proyectos = DB::table('proyectos')->select('id', 'nombre')->orderBy('nombre')->get();

        return response()->json([
            'users' => $users,
            'ciudades' => $ciudades,
            'sedes' => $sedes,
            'regionales' => $regionales,
            'proyectos' => $proyectos,
            'proveedores' => $this->proveedoresConocidos(),
            'tipos_sede' => ['Principal', 'Sucursal', 'Secundaria', 'Punto de Venta', 'Bodega', 'Oficina Administrativa'],
            'estados' => ['Activa', 'Inactiva', 'Cerrada'],
            'subcanales' => ['Retail', 'Corportivo', 'Directo', 'Online']
        ]);
    }

    // Primero los de las WO: unique() se queda con el primero y su nombre trae la ciudad.
    private function proveedoresConocidos()
    {
        $enWorkOrders = DB::table('work_orders')->where('proveedor', '!=', '')->distinct()->pluck('proveedor');
        $enCatalogo = DB::table('valores_parametro')
            ->join('tipos_parametro', 'tipos_parametro.id', '=', 'valores_parametro.tipo_parametro_id')
            ->where('tipos_parametro.nombre', 'Proveedor / Código Instalador')
            ->pluck('valores_parametro.nombre');

        return $enWorkOrders->concat($enCatalogo)
            ->map(fn ($nombre) => ['codigo' => ProveedorWorkOrder::codigoDe($nombre), 'nombre' => $nombre])
            ->unique('codigo')
            ->sortBy('nombre')
            ->values();
    }

    private function asociarProveedores(Sede $sede, array $data): void
    {
        if (!array_key_exists('proveedores_work_orders', $data)) {
            return;
        }

        $nombres = collect($data['proveedores_work_orders'])->keyBy(fn ($nombre) => ProveedorWorkOrder::codigoDe($nombre));

        // Solo bloquea agregar: una sede que ya tenía dos se puede seguir editando.
        $actuales = $sede->proveedoresWorkOrders()->pluck('codigo');
        if ($nombres->count() > 1 && $nombres->keys()->diff($actuales)->isNotEmpty()) {
            throw ValidationException::withMessages([
                'proveedores_work_orders' => 'Una sede solo puede tener un proveedor. Quita el que tiene para cambiarlo.',
            ]);
        }

        $enOtraSede = ProveedorWorkOrder::with('sede:id,nombre')
            ->whereIn('codigo', $nombres->keys())
            ->where('sede_id', '!=', $sede->id)
            ->first();
        if ($enOtraSede) {
            throw ValidationException::withMessages([
                'proveedores_work_orders' => "{$enOtraSede->nombre} ya está asociado a la sede {$enOtraSede->sede->nombre}.",
            ]);
        }

        $sede->proveedoresWorkOrders()->whereNotIn('codigo', $nombres->keys())->delete();
        foreach ($nombres as $codigo => $nombre) {
            $sede->proveedoresWorkOrders()->updateOrCreate(['codigo' => $codigo], ['nombre' => $nombre]);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre'                  => 'required|string|max:250',
            'id_ciudad'               => 'nullable|integer',
            'regional_id'             => 'nullable|integer',
            'proyecto_id'             => 'nullable|integer',
            'direccion'               => 'nullable|string|max:250',
            'telefono'                => 'nullable|string|max:50',
            'estado'                  => 'nullable|string|max:20',
            'id_almacenista_mac'      => 'nullable|integer',
            'id_secretaria_mac'       => 'nullable|integer',
            'id_jefe_mac'             => 'nullable|integer',
            'codigo_distribuidor'     => 'nullable|string|max:30', // Código PDV
            'codigo_instalador'       => 'nullable|string|max:30', // Código C.I
            'tipo_sede'               => 'nullable|string|max:20',
            'id_sede_padre'           => 'nullable|integer',
            'sub_canal'               => 'nullable|string|max:50',
            'supervisor'              => 'nullable|string|max:150',
            'contacto_supervisor'     => 'nullable|string|max:50',
            'lider_regional'          => 'nullable|string|max:150',
            'contacto_lider_regional' => 'nullable|string|max:50',
            'proveedores_work_orders'   => 'sometimes|array',
            'proveedores_work_orders.*' => 'string|max:150',
        ]);

        $sede = DB::transaction(function () use ($data) {
            $sede = Sede::create($data);
            $this->asociarProveedores($sede, $data);

            return $sede;
        });

        return response()->json($this->conCiudad($sede), 201);
    }

    public function show(Sede $sede)
    {
        return response()->json($this->conCiudad($sede->load(['padre', 'almacenista', 'secretaria', 'jefe', 'regional'])));
    }

    /**
     * `index()` trae ciudad_nombre/id_departamento via leftJoin; store/update/show devuelven el
     * modelo directo, así que se agregan aquí a mano para que el frontend (que reemplaza la fila
     * en su estado local con esta respuesta, sin recargar la lista) no muestre la ciudad en blanco.
     */
    private function conCiudad(Sede $sede): Sede
    {
        $sede->load('ciudad', 'proveedoresWorkOrders');
        $sede->ciudad_nombre = $sede->ciudad?->nombre;
        $sede->id_departamento = $sede->ciudad?->id_departamento;

        return $sede;
    }

    public function update(Request $request, Sede $sede)
    {
        $data = $request->validate([
            'nombre'                  => 'required|string|max:250',
            'id_ciudad'               => 'nullable|integer',
            'regional_id'             => 'nullable|integer',
            'proyecto_id'             => 'nullable|integer',
            'direccion'               => 'nullable|string|max:250',
            'telefono'                => 'nullable|string|max:50',
            'estado'                  => 'nullable|string|max:20',
            'id_almacenista_mac'      => 'nullable|integer',
            'id_secretaria_mac'       => 'nullable|integer',
            'id_jefe_mac'             => 'nullable|integer',
            'codigo_distribuidor'     => 'nullable|string|max:30', // Código PDV
            'codigo_instalador'       => 'nullable|string|max:30', // Código C.I
            'tipo_sede'               => 'nullable|string|max:20',
            'id_sede_padre'           => 'nullable|integer',
            'sub_canal'               => 'nullable|string|max:50',
            'supervisor'              => 'nullable|string|max:150',
            'contacto_supervisor'     => 'nullable|string|max:50',
            'lider_regional'          => 'nullable|string|max:150',
            'contacto_lider_regional' => 'nullable|string|max:50',
            'proveedores_work_orders'   => 'sometimes|array',
            'proveedores_work_orders.*' => 'string|max:150',
        ]);

        DB::transaction(function () use ($sede, $data) {
            $sede->update($data);
            $this->asociarProveedores($sede, $data);
        });

        return response()->json($this->conCiudad($sede->fresh(['padre', 'almacenista', 'secretaria', 'jefe', 'regional', 'proyecto'])));
    }

    public function destroy(Sede $sede)
    {
        $sede->delete();
        return response()->json(null, 204);
    }
}
