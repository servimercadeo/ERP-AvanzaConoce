<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sede;
use App\Models\Supervisor;
use App\Models\Torre;
use App\Models\User;
use App\Services\ProyectoDeEmpleado;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Parámetros > Operativos > Supervisores y Torres: a un empleado (sin tocar su rol ni su
 * cargo) se le asignan técnicos (supervisor) o sedes (torre). Solo se usan en el exporte de
 * Work Orders (ver WorkOrderController::conDatosDelTecnico y conSedeDelProveedor). Un técnico
 * tiene un solo supervisor y una sede una sola torre. Cada ruta fija {tipo} con ->defaults() y se lee con route('tipo').
 */
class AsignacionOperativaController extends Controller
{
    private const TIPOS = [
        'supervisores' => ['modelo' => Supervisor::class, 'singular' => 'supervisor', 'item' => 'El técnico'],
        'torres'       => ['modelo' => Torre::class, 'singular' => 'torre', 'item' => 'La sede'],
    ];

    public function index(Request $request)
    {
        $tipo = $request->route('tipo');

        return response()->json(
            $this->modelo($tipo)::with(['user:id,name,cargo', 'items'])->get()
                ->map(fn ($a) => $this->formato($tipo, $a))
                ->sortBy('nombre')->values()
        );
    }

    public function opciones(Request $request)
    {
        $items = $request->route('tipo') === 'supervisores'
            ? User::where('rol', 'tecnico')->orderBy('name')->get(['id', 'name', 'cedula'])
                ->map(fn (User $u) => ['id' => $u->id, 'nombre' => $u->cedula ? "{$u->name} ({$u->cedula})" : $u->name])
            : Sede::orderBy('nombre')->get(['id', 'nombre'])->map(fn (Sede $s) => ['id' => $s->id, 'nombre' => $s->nombre]);

        // Solo la gente de DIRECTV: es a quien se asigna, y la lista queda corta de buscar.
        $proyectos = ProyectoDeEmpleado::porUsuario();
        $empleados = User::where('activo', true)->get(['id', 'name', 'cargo'])
            ->map(fn (User $u) => [
                'id'       => $u->id,
                'nombre'   => $u->name,
                'cargo'    => $u->cargo,
                'proyecto' => $proyectos->get($u->id),
            ]);

        return response()->json([
            'empleados' => ProyectoDeEmpleado::soloDirectv($empleados),
            'items' => $items->values(),
        ]);
    }

    public function store(Request $request)
    {
        $tipo = $request->route('tipo');
        $data = $request->validate([
            'user_id'    => 'required|integer|exists:users,id',
            'item_ids'   => 'present|array',
            'item_ids.*' => 'integer|distinct',
        ]);
        $modelo = $this->modelo($tipo);
        if ($modelo::where('user_id', $data['user_id'])->exists()) {
            throw ValidationException::withMessages(['user_id' => 'Ese empleado ya es ' . self::TIPOS[$tipo]['singular'] . '.']);
        }

        $asignacion = DB::transaction(function () use ($modelo, $tipo, $data) {
            $asignacion = $modelo::create(['user_id' => $data['user_id']]);
            $this->asignarItems($tipo, $asignacion, $data['item_ids']);
            return $asignacion;
        });

        return response()->json($this->formato($tipo, $asignacion->load(['user:id,name,cargo', 'items'])), 201);
    }

    public function update(Request $request, string $id)
    {
        $tipo = $request->route('tipo');
        $data = $request->validate(['item_ids' => 'present|array', 'item_ids.*' => 'integer|distinct']);
        $asignacion = $this->modelo($tipo)::findOrFail($id);

        DB::transaction(fn () => $this->asignarItems($tipo, $asignacion, $data['item_ids']));

        return response()->json($this->formato($tipo, $asignacion->load(['user:id,name,cargo', 'items'])));
    }

    public function destroy(Request $request, string $id)
    {
        $this->modelo($request->route('tipo'))::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    private function asignarItems(string $tipo, $asignacion, array $ids): void
    {
        $relacion = $asignacion->items();
        $existentes = $relacion->getRelated()->newQuery()->whereKey($ids)->pluck('id');
        if ($existentes->count() !== count($ids)) {
            throw ValidationException::withMessages(['item_ids' => 'Alguno de los elegidos ya no existe.']);
        }

        $ocupado = $this->modelo($tipo)::with(['user:id,name', 'items' => fn ($q) => $q->whereKey($ids)])
            ->whereKeyNot($asignacion->id)
            ->whereHas('items', fn ($q) => $q->whereKey($ids))
            ->first();
        if ($ocupado) {
            $item = $ocupado->items->first();
            $nombre = $item->name ?? $item->nombre;
            throw ValidationException::withMessages([
                'item_ids' => self::TIPOS[$tipo]['item'] . " {$nombre} ya está con {$ocupado->user->name}. Quítalo de allá primero.",
            ]);
        }

        $relacion->sync($ids);
    }

    private function formato(string $tipo, $asignacion): array
    {
        return [
            'id'      => $asignacion->id,
            'user_id' => $asignacion->user_id,
            'nombre'  => $asignacion->user?->name,
            'cargo'   => $asignacion->user?->cargo,
            'items'   => $asignacion->items
                ->map(fn ($i) => ['id' => $i->id, 'nombre' => $tipo === 'supervisores' ? $i->name : $i->nombre])
                ->sortBy('nombre')->values(),
        ];
    }

    private function modelo(string $tipo): string
    {
        abort_unless(isset(self::TIPOS[$tipo]), 404);

        return self::TIPOS[$tipo]['modelo'];
    }
}
