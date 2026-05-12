<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sede;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            $query->where('sedes.nombre', 'like', "%$s%")
                  ->orWhere('sedes.codigo_distribuidor', 'like', "%$s%");
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
        $sedes->load(['padre', 'almacenista', 'secretaria', 'jefe']);

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

        return response()->json([
            'users' => $users,
            'ciudades' => $ciudades,
            'sedes' => $sedes,
            'tipos_sede' => ['Principal', 'Sucursal', 'Punto de Venta', 'Bodega', 'Oficina Administrativa'],
            'estados' => ['Activa', 'Inactiva', 'Cerrada'],
            'subcanales' => ['Retail', 'Corportivo', 'Directo', 'Online']
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre'              => 'required|string|max:250',
            'id_ciudad'           => 'nullable|integer',
            'direccion'           => 'nullable|string|max:250',
            'telefono'            => 'nullable|string|max:50',
            'estado'              => 'nullable|string|max:20',
            'id_almacenista_mac'  => 'nullable|integer',
            'id_secretaria_mac'   => 'nullable|integer',
            'id_jefe_mac'         => 'nullable|integer',
            'codigo_distribuidor' => 'nullable|string|max:30',
            'codigo_instalador'   => 'nullable|string|max:30', // Código C.I
            'tipo_sede'           => 'nullable|string|max:20',
            'id_sede_padre'       => 'nullable|integer',
            'sub_canal'           => 'nullable|string|max:50',
        ]);

        $sede = Sede::create($data);

        return response()->json($sede, 201);
    }

    public function show(Sede $sede)
    {
        return response()->json($sede->load(['padre', 'almacenista', 'secretaria', 'jefe']));
    }

    public function update(Request $request, Sede $sede)
    {
        $data = $request->validate([
            'nombre'              => 'required|string|max:250',
            'id_ciudad'           => 'nullable|integer',
            'direccion'           => 'nullable|string|max:250',
            'telefono'            => 'nullable|string|max:50',
            'estado'              => 'nullable|string|max:20',
            'id_almacenista_mac'  => 'nullable|integer',
            'id_secretaria_mac'   => 'nullable|integer',
            'id_jefe_mac'         => 'nullable|integer',
            'codigo_distribuidor' => 'nullable|string|max:30',
            'codigo_instalador'   => 'nullable|string|max:30', // Código C.I
            'tipo_sede'           => 'nullable|string|max:20',
            'id_sede_padre'       => 'nullable|integer',
            'sub_canal'           => 'nullable|string|max:50',
        ]);

        $sede->update($data);

        return response()->json($sede->fresh(['padre', 'almacenista', 'secretaria', 'jefe']));
    }

    public function destroy(Sede $sede)
    {
        $sede->delete();
        return response()->json(null, 204);
    }
}
