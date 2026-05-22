<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserPreferenceController extends Controller
{
    private const DEFAULTS = [
        'theme'      => 'teal',
        'dark'       => false,
        'fontSize'   => 'normal',
        'radius'     => 'default',
        'fontFamily' => 'nunito',
        'glass'      => false,
        'sidebar'    => 'standard',
        'shadows'    => 'soft',
        'navbar'     => 'fixed',
    ];

    /** GET /api/user/preferences — devuelve las preferencias del usuario autenticado */
    public function show(Request $request): JsonResponse
    {
        $pref = UserPreference::where('user_id', $request->user()->id)->first();

        return response()->json([
            'preferences' => $pref?->preferences ?? self::DEFAULTS,
        ]);
    }

    /** POST /api/user/preferences — actualiza las preferencias del usuario */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'preferences'            => 'required|array',
            'preferences.theme'      => 'sometimes|string|max:50',
            'preferences.dark'       => 'sometimes|boolean',
            'preferences.fontSize'   => 'sometimes|string|in:small,normal,large',
            'preferences.radius'     => 'sometimes|string|in:sharp,default,pill',
            'preferences.fontFamily' => 'sometimes|string|in:nunito,inter,poppins',
            'preferences.glass'      => 'sometimes|boolean',
            'preferences.sidebar'    => 'sometimes|string|in:standard,compact',
            'preferences.shadows'    => 'sometimes|string|in:soft,strong',
            'preferences.navbar'     => 'sometimes|string|in:fixed,floating',
        ]);

        $userId   = $request->user()->id;
        $existing = UserPreference::where('user_id', $userId)->first();

        // Fusionar con los existentes para no perder claves no enviadas
        $merged = array_merge(
            $existing?->preferences ?? self::DEFAULTS,
            $validated['preferences']
        );

        UserPreference::updateOrCreate(
            ['user_id' => $userId],
            ['preferences' => $merged]
        );

        return response()->json(['preferences' => $merged]);
    }
}
