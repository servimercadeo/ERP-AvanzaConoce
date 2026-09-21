<?php

namespace App\Services;

use App\Mail\ActaEntregaPedidoMail;
use App\Mail\ActaTrasladoPedidoMail;
use App\Models\PedidoCompra;
use App\Models\PedidoCompraItem;
use App\Models\TrasladoProducto;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Actas para Pedidos de oficina (pedidos_compra), disparadas desde la revisión manual
 * de stock (RevisionStockPedidoCompraController): de entrega si la sede pedida ya tenía
 * el stock, de traslado de inventario si hubo que traerlo de otra sede. Si no hay stock
 * en ningún lado y el item se envía a Compras, no se genera ningún acta.
 */
class ActaPedidoCompraService
{
    /**
     * El Acta de Entrega se dispara al ASIGNAR el pedido a alguien en Asignación de
     * Pedidos (no antes: sin nadie a cargo no tiene sentido notificar), y solo si ya hay
     * al menos un producto listo (aprobado por stock o por traslado). El destinatario es
     * el `responsable` del pedido (quien lo pidió y va a recibir los elementos), no la
     * persona recién asignada a gestionarlo.
     */
    public function enviarEntregaConsolidada(PedidoCompra $pedido, string $creadoPor): array
    {
        $items = $pedido->items()
            ->with('tipoProducto')
            ->whereIn('estado_revision', ['Aprobado por Stock', 'Traslado Aprobado'])
            ->get();

        if ($items->isEmpty()) {
            return ['enviada' => false, 'motivo' => 'Este pedido todavía no tiene productos listos para entregar.'];
        }

        $usuario = User::where('name', $pedido->responsable)->first();
        $correo = $usuario?->resolverEmailReal();

        if (!$correo) {
            return ['enviada' => false, 'motivo' => "No se encontró un correo real registrado para \"{$pedido->responsable}\"."];
        }

        try {
            $pdf = $this->generarEntregaConsolidada($pedido, $items, $creadoPor);
            Mail::to($correo)->send(new ActaEntregaPedidoMail($pedido->responsable, $pedido->codigo, 'SERVIMERCADEO', $pdf));

            return ['enviada' => true, 'destinatario' => $correo];
        } catch (\Throwable $e) {
            Log::error("No se pudo enviar el acta del pedido {$pedido->codigo}: " . $e->getMessage());

            return ['enviada' => false, 'motivo' => 'Ocurrió un error enviando el correo.'];
        }
    }

    /**
     * UNA sola Acta de Entrega por pedido, con todos los productos ya listos para
     * entregar (sea que se resolvieron con stock propio o por traslado — para quien
     * recibe, el origen no importa, solo que ya está disponible). Reutiliza EXACTAMENTE
     * la misma plantilla que las actas de entrega de Dotación (pdf.acta_entrega_dotacion):
     * el formato ("Acta de Entrega de Elementos") es genérico, no menciona dotación en
     * el cuerpo, así que sirve tal cual.
     */
    public function generarEntregaConsolidada(PedidoCompra $pedido, Collection $items, string $creadoPor): string
    {
        $sede = $pedido->sedeCatalogo?->nombre ?: $pedido->sede;

        $data = [
            'empresa'        => 'SERVIMERCADEO',
            'entregaNumero'  => $pedido->codigo,
            'solicitadoPor'  => $pedido->registra ?: $creadoPor,
            'fechaRegistro'  => optional($pedido->fecha_registro)->format('d/m/Y') ?? '—',
            'fechaEntrega'   => now()->format('d/m/Y'),
            // Sin traslado de por medio, origen y destino son la misma sede: se despachó
            // con lo que ya había ahí (mismo criterio que usa Dotación cuando no hay
            // movimiento entre sedes). Los productos que sí vinieron por traslado quedan
            // marcados como tal en su propia fila de la tabla de items.
            'sedeOrigen'     => $sede ?: '—',
            'sedeDestino'    => $sede ?: '—',
            'solicitadoPara' => $pedido->responsable ?: '—',
            'empleadoCedula' => '—',
            'observaciones'  => $items->pluck('observacion')->filter()->unique()->implode(' | ') ?: null,
            'items'          => $items->map(fn (PedidoCompraItem $it) => [
                'producto' => $it->tipoProducto?->nombre ?? $it->producto,
                'tipo'     => ($it->tipoProducto?->categoria ?: '—') . ($it->estado_revision === 'Traslado Aprobado' ? ' (Traslado)' : ''),
                'serial'   => $it->seriales ?: '—',
                'cantidad' => $it->cantidad,
            ])->values()->all(),
            'columnaExtra'          => 'Categoría',
            'mostrarColumnaSerial'  => true,
            'generadoEl'     => now()->format('d/m/Y H:i'),
        ];

        return Pdf::loadView('pdf.acta_entrega_dotacion', $data)->setPaper('a4')->output();
    }

    /**
     * Dotación no tiene equivalente de "acta de traslado" (sus traslados son entre
     * sedes de dotación y no generan documento), así que esta plantilla es nueva, pero
     * respeta la misma línea de diseño (colores, tipografía, estructura de encabezado).
     */
    public function generarTraslado(PedidoCompraItem $item, TrasladoProducto $traslado, string $creadoPor): string
    {
        $pedido = $item->pedido;

        $data = [
            'empresa'         => 'SERVIMERCADEO',
            'trasladoNumero'  => $pedido->codigo . '-T' . $traslado->id,
            'fechaTraslado'   => optional($traslado->created_at)->format('d/m/Y') ?? now()->format('d/m/Y'),
            'sedeOrigen'      => $traslado->origen?->sede?->nombre ?? '—',
            'sedeDestino'     => $traslado->sedeDestino?->nombre ?? '—',
            'solicitadoPor'   => $traslado->solicitado_por ?: $creadoPor,
            'producto'        => $item->tipoProducto?->nombre ?? $item->producto,
            'categoria'       => $item->tipoProducto?->categoria,
            'seriales'        => $traslado->seriales,
            'cantidad'        => $traslado->cantidad,
            'pedidoCodigo'    => $pedido->codigo,
            'responsablePide' => $pedido->responsable ?: '—',
            'generadoEl'      => now()->format('d/m/Y H:i'),
        ];

        return Pdf::loadView('pdf.acta_traslado_pedido', $data)->setPaper('a4')->output();
    }

    /**
     * Se dispara al APROBAR el traslado en Inventario General > Aprobación de Traslado
     * (ver TrasladoProductoController::aprobar()) — antes de aprobar no hay nada real que
     * notificar, porque el stock todavía no se movió. El destinatario es el
     * `responsable` del pedido, igual que en la entrega consolidada.
     */
    public function enviarActaTraslado(TrasladoProducto $traslado, string $creadoPor): array
    {
        $item = $traslado->item;
        $pedido = $item?->pedido;

        if (!$item || !$pedido) {
            return ['enviada' => false, 'motivo' => 'No se encontró el pedido de este traslado.'];
        }

        $usuario = User::where('name', $pedido->responsable)->first();
        $correo = $usuario?->resolverEmailReal();

        if (!$correo) {
            return ['enviada' => false, 'motivo' => "No se encontró un correo real registrado para \"{$pedido->responsable}\"."];
        }

        try {
            $pdf = $this->generarTraslado($item, $traslado, $creadoPor);
            Mail::to($correo)->send(new ActaTrasladoPedidoMail($pedido->responsable, $pedido->codigo, 'SERVIMERCADEO', $pdf));

            return ['enviada' => true, 'destinatario' => $correo];
        } catch (\Throwable $e) {
            Log::error("No se pudo enviar el acta de traslado {$pedido->codigo}-T{$traslado->id}: " . $e->getMessage());

            return ['enviada' => false, 'motivo' => 'Ocurrió un error enviando el correo.'];
        }
    }
}
