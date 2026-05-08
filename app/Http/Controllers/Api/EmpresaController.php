<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;

class EmpresaController extends Controller
{
    public function index()
    {
        return response()->json(
            Empresa::where('activo', true)->orderBy('nombre')->get(['id', 'nombre', 'pais'])
        );
    }
}
