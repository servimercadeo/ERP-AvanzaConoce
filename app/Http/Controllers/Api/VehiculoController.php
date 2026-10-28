<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Vehiculo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class VehiculoController extends Controller
{
    private const REGLAS_COMUNES = [
        'tipo'                       => 'required|in:Carro,Moto',
        'cc_propietario'             => 'nullable|string|max:30',
        'fecha_matricula'            => 'nullable|date',
        'fecha_vence_soat'           => 'nullable|date',
        'fecha_vence_tecnomecanica'  => 'nullable|date',
        'tecnico_asignado_id'        => 'nullable|exists:users,id',
        'tarjeta_propiedad_frontal'  => 'nullable|file|image|max:8192',
        'tarjeta_propiedad_trasera'  => 'nullable|file|image|max:8192',
    ];

    public function index()
    {
        return response()->json(
            Vehiculo::with('tecnicoAsignado:id,name,cedula')
                ->orderBy('placa')
                ->get()
        );
    }

    /** Técnicos disponibles para el selector "Técnico asignado". */
    public function tecnicos()
    {
        return response()->json(
            User::where('rol', 'tecnico')->orderBy('name')->get(['id', 'name', 'cedula'])
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate(array_merge(self::REGLAS_COMUNES, [
            'placa' => 'required|string|max:20|unique:vehiculos,placa',
        ]));
        $data['placa'] = strtoupper(trim($data['placa']));

        $this->guardarArchivos($request, $data);

        $vehiculo = Vehiculo::create($data);
        $vehiculo->load('tecnicoAsignado:id,name,cedula');

        return response()->json($vehiculo, 201);
    }

    public function update(Request $request, Vehiculo $vehiculo)
    {
        $data = $request->validate(array_merge(self::REGLAS_COMUNES, [
            'placa' => ['required', 'string', 'max:20', Rule::unique('vehiculos', 'placa')->ignore($vehiculo->id)],
        ]));
        $data['placa'] = strtoupper(trim($data['placa']));

        $this->guardarArchivos($request, $data, $vehiculo);

        $vehiculo->update($data);
        $vehiculo->load('tecnicoAsignado:id,name,cedula');

        return response()->json($vehiculo);
    }

    public function destroy(Vehiculo $vehiculo)
    {
        foreach (['tarjeta_propiedad_frontal', 'tarjeta_propiedad_trasera'] as $campo) {
            if ($vehiculo->$campo) {
                Storage::disk('local')->delete($vehiculo->$campo);
            }
        }
        $vehiculo->delete();

        return response()->json(null, 204);
    }

    public function descargarArchivo(Vehiculo $vehiculo, string $cara)
    {
        abort_unless(in_array($cara, ['frontal', 'trasera'], true), 404);
        $campo = "tarjeta_propiedad_{$cara}";
        abort_unless($vehiculo->$campo && Storage::disk('local')->exists($vehiculo->$campo), 404);

        return response()->file(Storage::disk('local')->path($vehiculo->$campo));
    }

    /** Sube (o reemplaza) las fotos de la tarjeta de propiedad que vengan en la petición. */
    private function guardarArchivos(Request $request, array &$data, ?Vehiculo $vehiculo = null): void
    {
        foreach (['tarjeta_propiedad_frontal', 'tarjeta_propiedad_trasera'] as $campo) {
            if (!$request->hasFile($campo)) {
                unset($data[$campo]);
                continue;
            }
            if ($vehiculo?->$campo) {
                Storage::disk('local')->delete($vehiculo->$campo);
            }
            $file = $request->file($campo);
            $data[$campo] = $file->storeAs('vehiculos', Str::uuid() . '.' . $file->getClientOriginalExtension(), 'local');
        }
    }
}
