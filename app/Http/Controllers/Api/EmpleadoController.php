<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EmpleadoController extends Controller
{
    public function index()
    {
        return response()->json(
            User::with('empresa')
                ->whereNotNull('cedula')
                ->where('cedula', '!=', '')
                ->orderBy('apellidos')
                ->orderBy('nombres')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        $this->normalizarNombres($data);
        $data['name']   = trim($data['nombres'] . ' ' . $data['apellidos']);
        $data['rol']    = $data['rol'] ?? 'consultor';
        $data['activo'] = true;

        // Contraseña temporal de 10 caracteres: 2 mayúsculas + 5 minúsculas + 3 dígitos
        $plainPassword  = strtoupper(Str::random(2)) . strtolower(Str::random(5)) . rand(100, 999);
        $data['password'] = Hash::make($plainPassword);

        $empleado = User::create($data);

        return response()->json([
            'empleado'     => $empleado->load('empresa'),
            'credenciales' => [
                'email'    => $empleado->email,
                'password' => $plainPassword,
            ],
        ], 201);
    }

    public function show(User $empleado)
    {
        return response()->json($empleado->load('empresa'));
    }

    public function update(Request $request, User $empleado)
    {
        $data = $request->validate($this->rules($empleado->id));

        $this->normalizarNombres($data);
        $data['name'] = trim($data['nombres'] . ' ' . $data['apellidos']);

        $empleado->update($data);

        return response()->json($empleado->fresh()->load('empresa'));
    }

    public function destroy(User $empleado)
    {
        $empleado->delete();

        return response()->json(null, 204);
    }

    private function normalizarNombres(array &$data): void
    {
        $campos = ['nombres', 'apellidos', 'cargo', 'fondo_pensiones', 'arl', 'tipo_funcionario', 'eps', 'caja_compensacion'];
        foreach ($campos as $campo) {
            if (isset($data[$campo])) {
                $data[$campo] = mb_strtoupper($data[$campo], 'UTF-8');
            }
        }
    }

    private function rules(?int $ignoreId = null): array
    {
        return [
            // Obligatorios
            'cedula'           => 'required|string|max:20',
            'apellidos'        => 'required|string|max:150',
            'nombres'          => 'required|string|max:150',
            'sede'             => 'required|string|max:100',
            'genero'           => 'required|string|max:50',
            'movil'            => 'required|string|max:20',
            'email'            => ['required', 'email', Rule::unique('users', 'email')->ignore($ignoreId)],
            'eps'              => 'required|string|max:100',
            'arl'              => 'required|string|max:100',
            'fondo_pensiones'  => 'required|string|max:100',
            'estado_empleado'  => 'required|string|max:50',
            'cargo'            => 'required|string|max:150',
            'tipo_funcionario' => 'required|string|max:100',
            'tipo_vinculacion' => 'required|string|max:100',

            // Opcionales
            'fotografia'           => 'nullable|string|max:500',
            'fecha_nacimiento'     => 'nullable|date',
            'lugar_nacimiento'     => 'nullable|string|max:150',
            'raza'                 => 'nullable|string|max:80',
            'estado_civil'         => 'nullable|string|max:50',
            'nivel_escolaridad'    => 'nullable|string|max:80',
            'direccion_residencia' => 'nullable|string|max:250',
            'estrato'              => 'nullable|string|max:5',
            'barrio'               => 'nullable|string|max:100',
            'numero_hijos'         => 'nullable|integer|min:0',
            'ingresos'             => 'nullable|numeric|min:0',
            'observaciones_medicas'=> 'nullable|string',
            'alergias'             => 'nullable|string',
            'rh'                   => 'nullable|string|max:5',
            'caja_compensacion'    => 'nullable|string|max:100',
            'licencia_carro'       => 'nullable|string|max:20',
            'licencia_carro_vence' => 'nullable|date',
            'licencia_moto'        => 'nullable|string|max:20',
            'licencia_moto_vence'  => 'nullable|date',
            'tiene_cert_alturas'   => 'nullable|boolean',
            'cert_alturas_vence'   => 'nullable|date',
            'codigo_directv'       => 'nullable|string|max:30',
            'empresa_id'           => 'nullable|exists:empresas,id',
            'comentarios'          => 'nullable|string',
            'contacto_emergencia_nombre'     => 'nullable|string|max:150',
            'contacto_emergencia_telefono'   => 'nullable|string|max:20',
            'contacto_emergencia_parentesco' => 'nullable|string|max:80',
            'cuenta_bancaria'      => 'nullable|string|max:30',
            'tipo_cuenta'          => 'nullable|string|max:30',
            'banco'                => 'nullable|string|max:100',
        ];
    }
}
