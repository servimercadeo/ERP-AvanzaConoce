<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppSettingController extends Controller
{
    /**
     * GET /api/settings
     * Público: devuelve la configuración global de la app (ej: tema de color).
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'theme' => AppSetting::getValue('theme', 'teal'),
        ]);
    }

    /**
     * POST /api/settings
     * Protegido (Sanctum): actualiza uno o varios ajustes globales.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'theme' => 'sometimes|string|max:50',
        ]);

        foreach ($validated as $key => $value) {
            AppSetting::setValue($key, $value);
        }

        return response()->json([
            'theme' => AppSetting::getValue('theme', 'teal'),
        ]);
    }
}
