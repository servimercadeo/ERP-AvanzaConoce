<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ActaAsignacionInventarioMail;
use App\Models\AsignacionInventario;
use App\Models\InventarioProducto;
use App\Models\InventarioProductoSerie;
use App\Services\ActaAsignacionInventarioService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Custodia de inventario: quién tiene actualmente una unidad (o una cantidad, si no es
 * serializado) de un producto fuera de la sede. Asignar DESCUENTA stock real de
 * inventario_productos — si es un serial puntual, además lo saca de
 * inventario_producto_series — y devolver hace exactamente lo contrario. Mismo
 * principio de "nunca ocurre solo" que el resto del sistema: cada paso lo dispara un
 * clic explícito.
 */
class AsignacionInventarioController extends Controller
{
    public function index(Request $request)
    {
        $query = AsignacionInventario::with(['user:id,name', 'inventarioProducto.tipoProducto', 'inventarioProducto.sede']);

        if ($request->estado === 'activas') {
            $query->whereNull('fecha_devolucion');
        } elseif ($request->estado === 'devueltas') {
            $query->whereNotNull('fecha_devolucion');
        }
        if ($request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        return response()->json(
            $query->orderByDesc('id')->get()->map(fn (AsignacionInventario $a) => $this->serializar($a))
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'inventario_producto_id' => 'required|exists:inventario_productos,id',
            'user_id'                => 'required|exists:users,id',
            'serial'                 => 'nullable|string|max:100',
            'cantidad'               => 'required|integer|min:1',
            'observacion'            => 'nullable|string|max:500',
        ]);

        return DB::transaction(function () use ($data, $request) {
            $inv = InventarioProducto::lockForUpdate()->findOrFail($data['inventario_producto_id']);
            $serial = trim($data['serial'] ?? '');

            if ($serial !== '') {
                if ((int) $data['cantidad'] !== 1) {
                    throw ValidationException::withMessages([
                        'cantidad' => 'Si eliges un serial puntual, la cantidad debe ser 1 (cada serial es una unidad).',
                    ]);
                }

                $fila = InventarioProductoSerie::where('inventario_producto_id', $inv->id)
                    ->where('serial', $serial)
                    ->first();
                if (!$fila) {
                    throw ValidationException::withMessages([
                        'serial' => "El serial \"{$serial}\" no está disponible en este item.",
                    ]);
                }
                $fila->delete();
            } elseif ($inv->cantidad < $data['cantidad']) {
                throw ValidationException::withMessages([
                    'cantidad' => "Solo hay {$inv->cantidad} disponibles; no se puede asignar {$data['cantidad']}.",
                ]);
            }

            $inv->decrement('cantidad', $data['cantidad']);

            $asignacion = AsignacionInventario::create([
                'inventario_producto_id' => $inv->id,
                'user_id'                => $data['user_id'],
                'serial'                 => $serial !== '' ? $serial : null,
                'cantidad'               => $data['cantidad'],
                'fecha_asignacion'       => now()->toDateString(),
                'observacion'            => $data['observacion'] ?? null,
                'asignado_por'           => $request->user()?->name ?? 'Sistema',
            ]);

            return response()->json($this->serializar($asignacion->fresh(['user', 'inventarioProducto.tipoProducto', 'inventarioProducto.sede'])), 201);
        });
    }

    /**
     * Devuelve la unidad/cantidad al inventario de la sede de origen: si era un serial
     * puntual, se re-crea esa fila en inventario_producto_series (vuelve a estar
     * disponible con el mismo serial); si no, solo se le suma la cantidad de vuelta.
     */
    public function devolver(Request $request, AsignacionInventario $asignacionInventario)
    {
        if ($asignacionInventario->fecha_devolucion) {
            return response()->json(['message' => 'Esta asignación ya fue devuelta.'], 422);
        }

        return DB::transaction(function () use ($asignacionInventario) {
            $inv = InventarioProducto::lockForUpdate()->find($asignacionInventario->inventario_producto_id);

            if ($inv) {
                $inv->increment('cantidad', $asignacionInventario->cantidad);
                if ($asignacionInventario->serial) {
                    InventarioProductoSerie::create([
                        'inventario_producto_id' => $inv->id,
                        'serial'                 => $asignacionInventario->serial,
                    ]);
                }
            }

            $asignacionInventario->update(['fecha_devolucion' => now()->toDateString()]);

            return response()->json($this->serializar($asignacionInventario->fresh(['user', 'inventarioProducto.tipoProducto', 'inventarioProducto.sede'])));
        });
    }

    /**
     * Mismo diseño de PDF y de correo que las actas de entrega de Dotación / Pedidos:
     * se envía al empleado que quedó a cargo del elemento (`asignacion.user`), del cual
     * ya tenemos la relación real (no hay que adivinar por nombre como en Pedidos). Un
     * correo no resuelto no bloquea la asignación ya hecha, solo se informa.
     */
    public function actaEntrega(Request $request, AsignacionInventario $asignacionInventario)
    {
        $asignacionInventario->loadMissing(['user', 'inventarioProducto.tipoProducto', 'inventarioProducto.sede']);
        $correo = $asignacionInventario->user?->resolverEmailReal();

        if (!$correo) {
            return response()->json([
                'enviada' => false,
                'motivo'  => "No se encontró un correo real registrado para \"{$asignacionInventario->user?->name}\".",
            ]);
        }

        $referencia = 'ASIG-' . str_pad((string) $asignacionInventario->id, 4, '0', STR_PAD_LEFT);

        try {
            $pdf = app(ActaAsignacionInventarioService::class)->generar(
                $asignacionInventario,
                $request->user()?->name ?? 'Sistema'
            );
            Mail::to($correo)->send(new ActaAsignacionInventarioMail(
                $asignacionInventario->user->name,
                $referencia,
                'SERVIMERCADEO',
                $pdf,
            ));

            return response()->json(['enviada' => true, 'destinatario' => $correo]);
        } catch (\Throwable $e) {
            Log::error("No se pudo enviar el acta de la asignación {$asignacionInventario->id}: " . $e->getMessage());

            return response()->json(['enviada' => false, 'motivo' => 'Ocurrió un error enviando el correo.']);
        }
    }

    private function serializar(AsignacionInventario $a): array
    {
        $inv = $a->inventarioProducto;

        return [
            'id'               => $a->id,
            'inventario_producto_id' => $a->inventario_producto_id,
            'producto'         => $inv?->tipoProducto?->nombre,
            'categoria'        => $inv?->tipoProducto?->categoria,
            'talla'            => $inv?->talla ?: null,
            'sede'             => $inv?->sede?->nombre,
            'user_id'          => $a->user_id,
            'asignado_a'       => $a->user?->name,
            'serial'           => $a->serial,
            'cantidad'         => $a->cantidad,
            'fecha_asignacion' => $a->fecha_asignacion?->format('Y-m-d'),
            'fecha_devolucion' => $a->fecha_devolucion?->format('Y-m-d'),
            'observacion'      => $a->observacion,
            'asignado_por'     => $a->asignado_por,
            'activa'           => is_null($a->fecha_devolucion),
        ];
    }
}
