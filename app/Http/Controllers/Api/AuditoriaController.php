<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use Illuminate\Http\Request;

/**
 * Auditoría del Sistema (Permisos > Auditoría): rastro de quién creó/editó/eliminó qué,
 * en qué proceso del ERP. Las filas las escribe RegistraAuditoria (ver app/Traits), este
 * controlador solo lee/filtra. Acceso restringido a admin (ver routes/api.php).
 */
class AuditoriaController extends Controller
{
    public function index(Request $request)
    {
        $query = Auditoria::query();

        if ($request->user_id) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->accion) {
            $query->where('accion', $request->accion);
        }
        if ($request->proceso) {
            $query->where('proceso', $request->proceso);
        }
        if ($request->consecutivo) {
            $query->where('id', $request->consecutivo);
        }
        if ($request->fecha_inicio) {
            $query->whereDate('created_at', '>=', $request->fecha_inicio);
        }
        if ($request->fecha_fin) {
            $query->whereDate('created_at', '<=', $request->fecha_fin);
        }

        if ($request->boolean('export')) {
            return response()->json(['data' => $query->orderByDesc('id')->limit(5000)->get()]);
        }

        $porPagina = (int) ($request->por_pagina ?: 10);
        $porPagina = in_array($porPagina, [10, 25, 50, 100], true) ? $porPagina : 10;

        $paginado = $query->orderByDesc('id')->paginate($porPagina);

        return response()->json($paginado);
    }

    /**
     * Procesos conocidos, para llenar el <select> de filtro sin tener que escanear toda
     * la tabla desde el frontend cada vez.
     */
    public function procesos()
    {
        return response()->json(
            Auditoria::select('proceso')->distinct()->orderBy('proceso')->pluck('proceso')
        );
    }
}
