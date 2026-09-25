<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PedidoCompra;
use App\Models\TipoProducto;
use App\Models\User;
use App\Services\ActaPedidoCompraService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PedidoCompraController extends Controller
{
    public function index()
    {
        return response()->json(
            PedidoCompra::with(['items.tipoProducto:id,nombre,categoria', 'asignadoA:id,name', 'empresa:id,nombre'])->orderBy('id', 'desc')->get()
        );
    }

    /**
     * Asignación de Pedidos: quién queda a cargo de GESTIONAR este pedido (cotizar,
     * comprar, hacer seguimiento) — no confundir con `responsable`, que es quién lo
     * pidió. Solo se puede asignar una vez que la revisión de stock dejó al menos un
     * producto listo para entregar (aprobado por stock o por traslado): antes de eso no
     * hay nada que gestionar todavía. Al asignar a alguien por primera vez (o al
     * reasignar), justo ahí se envía el Acta de Entrega consolidada al responsable del
     * pedido con lo que ya quedó aprobado. Mandar `asignado_a_user_id: null` desasigna
     * el pedido sin enviar nada.
     */
    public function asignar(Request $request, PedidoCompra $pedidoCompra)
    {
        $data = $request->validate([
            'asignado_a_user_id' => 'nullable|integer|exists:users,id',
        ]);

        $nuevoAsignado = $data['asignado_a_user_id'] ?? null;

        if ($nuevoAsignado) {
            $tieneItemListo = $pedidoCompra->items()
                ->whereIn('estado_revision', ['Aprobado por Stock', 'Traslado Aprobado'])
                ->exists();

            if (!$tieneItemListo) {
                return response()->json([
                    'message' => 'Primero revisa el stock de este pedido: todavía no tiene productos listos para entregar.',
                ], 422);
            }
        }

        $pedidoCompra->update(['asignado_a_user_id' => $nuevoAsignado]);

        $acta = $nuevoAsignado
            ? app(ActaPedidoCompraService::class)->enviarEntregaConsolidada($pedidoCompra->fresh(), $request->user()?->name ?? 'Sistema')
            : null;

        return response()->json(array_merge(
            $pedidoCompra->fresh()->load(['items', 'asignadoA:id,name'])->toArray(),
            ['acta' => $acta]
        ));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'tipo_responsable'         => 'required|in:Empleado,Aliado',
            'responsable'              => 'required|string|max:150',
            'sede'                     => 'required|string|max:150',
            'clase'                    => 'required|string|max:150',
            'concepto'                 => 'required|string|max:150',
            'estado'                   => 'nullable|string|max:50',
            'estado_compra'            => 'nullable|string|max:50',
            'items'                    => 'required|array|min:1',
            'items.*.tipo_producto_id' => 'required|exists:tipos_producto,id',
            'items.*.cantidad'         => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($data, $request) {
            $pedido = PedidoCompra::create([
                'codigo'           => PedidoCompra::generarCodigo(),
                'fecha_registro'   => now()->toDateString(),
                'tipo_responsable' => $data['tipo_responsable'],
                'responsable'      => $data['responsable'],
                'empresa_id'       => $this->resolverEmpresaId($data['tipo_responsable'], $data['responsable']),
                'sede'             => $data['sede'],
                'clase'            => $data['clase'],
                'concepto'         => $data['concepto'],
                'estado'           => $data['estado'] ?? 'Pendiente Aprobación',
                'estado_compra'    => $data['estado_compra'] ?? null,
                'registra'         => $request->user()?->name ?? 'Sistema',
            ]);

            $pedido->items()->createMany($this->resolverItems($data['items']));

            return response()->json($pedido->load('items'), 201);
        });
    }

    public function show(PedidoCompra $pedidoCompra)
    {
        return response()->json($pedidoCompra->load('items'));
    }

    /**
     * Todos los campos son opcionales aquí a propósito: la tabla de Pedidos usa
     * este mismo endpoint para actualizaciones parciales (ej. el checkbox "Enviar
     * a Compras" solo manda {estado, estado_compra}), sin tener que reenviar todo
     * el formulario ni los items cada vez.
     */
    public function update(Request $request, PedidoCompra $pedidoCompra)
    {
        $data = $request->validate([
            'tipo_responsable'         => 'sometimes|required|in:Empleado,Aliado',
            'responsable'              => 'sometimes|required|string|max:150',
            'sede'                     => 'sometimes|required|string|max:150',
            'clase'                    => 'sometimes|required|string|max:150',
            'concepto'                 => 'sometimes|required|string|max:150',
            'estado'                   => 'sometimes|nullable|string|max:50',
            'estado_compra'            => 'sometimes|nullable|string|max:50',
            'items'                    => 'sometimes|array|min:1',
            'items.*.tipo_producto_id' => 'required_with:items|exists:tipos_producto,id',
            'items.*.cantidad'         => 'required_with:items|integer|min:1',
        ]);

        // El check "Enviar a Compras" solo se puede activar cuando la revisión de
        // stock ya concluyó, para al menos una prenda, que no hay existencias en
        // ninguna sede (mismo criterio que en Dotación).
        if (($data['estado'] ?? null) === 'Enviado a compras' && $pedidoCompra->estado !== 'Enviado a compras') {
            $tieneItemParaComprar = $pedidoCompra->items()
                ->where('estado_revision', 'Enviado a Compras')
                ->exists();

            if (!$tieneItemParaComprar) {
                return response()->json([
                    'message' => 'Primero confirma, revisando cada producto, que no hay stock en ninguna sede.',
                ], 422);
            }
        }

        // Si cambia el responsable (o su tipo), la empresa "dueña" del pedido se
        // vuelve a resolver — es un snapshot que sigue al responsable ACTUAL del
        // pedido, no algo que se edite directamente.
        if (array_key_exists('responsable', $data) || array_key_exists('tipo_responsable', $data)) {
            $data['empresa_id'] = $this->resolverEmpresaId(
                $data['tipo_responsable'] ?? $pedidoCompra->tipo_responsable,
                $data['responsable'] ?? $pedidoCompra->responsable,
            );
        }

        return DB::transaction(function () use ($data, $pedidoCompra) {
            $pedidoCompra->update(collect($data)->except('items')->all());

            if (array_key_exists('items', $data)) {
                $pedidoCompra->items()->delete();
                $pedidoCompra->items()->createMany($this->resolverItems($data['items']));
            }

            return response()->json($pedidoCompra->fresh()->load('items'));
        });
    }

    public function destroy(PedidoCompra $pedidoCompra)
    {
        $pedidoCompra->delete();
        return response()->json(null, 204);
    }

    /**
     * Empresa "dueña" del pedido: la del EMPLEADO para quien se pide (resuelto por
     * nombre exacto contra `users`, mismo criterio que el resto del sistema para
     * encontrar al responsable). Los "Aliado" no son usuarios del ERP, así que quedan
     * sin empresa (null) — no hay de dónde resolverla.
     */
    private function resolverEmpresaId(string $tipoResponsable, string $responsable): ?int
    {
        if ($tipoResponsable !== 'Empleado') {
            return null;
        }

        return User::where('name', $responsable)->value('empresa_id');
    }

    /**
     * El nombre de producto que se guarda en el item es un snapshot resuelto en el
     * servidor a partir del catálogo real (nunca se confía en texto libre del cliente).
     */
    private function resolverItems(array $items): array
    {
        $tipos = TipoProducto::whereIn('id', array_column($items, 'tipo_producto_id'))
            ->get(['id', 'nombre'])
            ->keyBy('id');

        return array_map(fn ($item) => [
            'tipo_producto_id' => $item['tipo_producto_id'],
            'producto'         => $tipos->get($item['tipo_producto_id'])?->nombre ?? 'Producto',
            'cantidad'         => $item['cantidad'],
        ], $items);
    }
}
