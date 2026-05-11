<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\UserSyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function __construct(private UserSyncService $sync) {}

    /**
     * Crea un usuario en el ERP y lo replica a AvanzaConoce.
     * Solo un admin del ERP puede llamar este endpoint.
     * POST /api/users
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => ['required', Password::min(8)],
            'rol'      => 'sometimes|in:admin,gestor,consultor',
        ]);

        $usuario = $this->sync->crearEnErpYSincronizar($data);

        return response()->json([
            'message' => 'Usuario creado y sincronizado con AvanzaConoce.',
            'user'    => [
                'id'               => $usuario->id,
                'name'             => $usuario->name,
                'email'            => $usuario->email,
                'rol'              => $usuario->rol,
                'avanzaconoce_id'  => $usuario->avanzaconoce_id,
            ],
        ], 201);
    }

    /**
     * AvanzaConoce llama este endpoint para registrar un usuario
     * que ya existe allá pero aún no está en el ERP.
     * POST /api/users/desde-avanzaconoce
     */
    public function recibirDeAvanzaconoce(Request $request)
    {
        $secretRecibido = $request->header('X-ERP-Secret');

        if ($secretRecibido !== config('sso.secret')) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $data = $request->validate([
            'name'            => 'required|string|max:255',
            'email'           => 'required|email',
            'password'        => 'required|string',
            'avanzaconoce_id' => 'required|integer',
        ]);

        $usuario = User::updateOrCreate(
            ['email' => $data['email']],
            [
                'name'            => $data['name'],
                'password'        => Hash::make($data['password']),
                'avanzaconoce_id' => $data['avanzaconoce_id'],
                'activo'          => true,
            ]
        );

        return response()->json([
            'id'    => $usuario->id,
            'email' => $usuario->email,
        ], 201);
    }
}
