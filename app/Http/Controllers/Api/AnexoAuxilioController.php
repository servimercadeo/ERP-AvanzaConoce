<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnexoAuxilio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Parámetros > Anexos y Auxilios: las opciones del select "Anexo / Auxilio" de Contratos.
 * Los contratos guardan el nombre como TEXTO (contrato_anexos.anexo_auxilio), igual que el
 * cargo: por eso un renombre se propaga a ellos y una opción en uso no se elimina.
 */
class AnexoAuxilioController extends Controller
{
    private const MENSAJES = [
        'nombre.required' => 'Escribe el nombre del anexo o auxilio.',
        'nombre.max'      => 'El nombre admite máximo 150 caracteres.',
        'nombre.unique'   => 'Ya existe un anexo o auxilio con ese nombre.',
    ];

    public function index()
    {
        $usos = DB::table('contrato_anexos')->whereNotNull('anexo_auxilio')
            ->selectRaw('UPPER(TRIM(anexo_auxilio)) as clave, COUNT(*) as n')->groupBy('clave')->pluck('n', 'clave');

        return response()->json(
            AnexoAuxilio::orderBy('nombre')->get()
                ->each(fn (AnexoAuxilio $a) => $a->setAttribute('contratos_count', (int) ($usos[self::clave($a->nombre)] ?? 0)))
        );
    }

    public function store(Request $request)
    {
        return response()->json(AnexoAuxilio::create($this->validar($request)), 201);
    }

    public function update(Request $request, AnexoAuxilio $anexoAuxilio)
    {
        $data = $this->validar($request, $anexoAuxilio);
        $anterior = $anexoAuxilio->nombre;

        DB::transaction(function () use ($anexoAuxilio, $data, $anterior) {
            $anexoAuxilio->update($data);
            // Renombre: los contratos con el nombre anterior quedan con el nuevo (si no, en su
            // formulario el anexo ya no coincidiría con ninguna opción).
            if (self::clave($anterior) !== self::clave($anexoAuxilio->nombre)) {
                DB::table('contrato_anexos')->whereRaw('UPPER(TRIM(anexo_auxilio)) = ?', [self::clave($anterior)])
                    ->update(['anexo_auxilio' => $anexoAuxilio->nombre]);
            }
        });

        return response()->json($anexoAuxilio->fresh());
    }

    public function destroy(AnexoAuxilio $anexoAuxilio)
    {
        $usos = DB::table('contrato_anexos')->whereRaw('UPPER(TRIM(anexo_auxilio)) = ?', [self::clave($anexoAuxilio->nombre)])->count();
        if ($usos) {
            return response()->json([
                'message' => "No se puede eliminar «{$anexoAuxilio->nombre}»: está en {$usos} contrato(s).",
            ], 422);
        }

        $anexoAuxilio->delete();

        return response()->json(null, 204);
    }

    private function validar(Request $request, ?AnexoAuxilio $anexo = null): array
    {
        $request->merge(['nombre' => mb_strtoupper(preg_replace('/\s+/', ' ', trim((string) $request->input('nombre'))), 'UTF-8')]);

        return $request->validate([
            'nombre' => ['required', 'string', 'max:150', Rule::unique('anexos_auxilios', 'nombre')->ignore($anexo?->id)],
        ], self::MENSAJES);
    }

    private static function clave(?string $nombre): string
    {
        return mb_strtoupper(trim((string) $nombre), 'UTF-8');
    }
}
