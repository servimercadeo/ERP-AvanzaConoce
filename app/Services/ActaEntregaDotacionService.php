<?php

namespace App\Services;

use App\Models\PedidoAutomatico;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class ActaEntregaDotacionService
{
    /**
     * Genera el PDF del acta de entrega de dotación para un pedido automático
     * individual (un empleado). Se asume que $pedido ya trae cargadas las
     * relaciones 'empleado.empresa', 'contrato' e 'items.inventario'.
     */
    public function generar(PedidoAutomatico $pedido, string $creadoPor): string
    {
        $empleado = $pedido->empleado;

        $items = $pedido->items->map(fn ($it) => [
            'producto'  => $it->inventario?->prenda ?? '—',
            'tipo'      => $it->inventario?->talla ?? '—',
            'cantidad'  => $it->cantidad,
        ])->values()->all();

        $data = [
            'empresa'         => $this->resolverEmpresa($pedido),
            'entregaNumero'   => $pedido->codigo,
            'solicitadoPor'   => $creadoPor,
            'fechaRegistro'   => $pedido->fecha_pedido ? Carbon::parse($pedido->fecha_pedido)->format('d/m/Y') : '—',
            'fechaEntrega'    => now()->format('d/m/Y'),
            // Origen: sede del contrato que generó el pedido (de dónde se gestiona/despacha la
            // dotación). Destino: sede actual del empleado (a dónde va), pueden diferir si el
            // empleado fue trasladado después de la fecha del contrato.
            'sedeOrigen'      => $pedido->contrato?->sede ?: ($empleado?->sede ?: '—'),
            'sedeDestino'     => $empleado?->sede ?: '—',
            'solicitadoPara'  => trim(($empleado?->nombres ?? '') . ' ' . ($empleado?->apellidos ?? '')) ?: '—',
            'empleadoCedula'  => $empleado?->cedula ?? '—',
            'observaciones'   => $pedido->notas,
            'items'           => $items,
            'generadoEl'      => now()->format('d/m/Y H:i'),
        ];

        return Pdf::loadView('pdf.acta_entrega_dotacion', $data)
            ->setPaper('a4')
            ->output();
    }

    /**
     * "SERVIMERCADEO" o "SYM" según la empresa del contrato que originó el pedido
     * (con reglas.empresa registrada en pedidos_automaticos->contrato), o la empresa
     * actual del empleado si el pedido no tiene contrato asociado. Sin dato, se asume
     * SERVIMERCADEO (comportamiento previo, cuando el texto estaba fijo).
     */
    public function resolverEmpresa(PedidoAutomatico $pedido): string
    {
        $nombre = $pedido->contrato?->empresa ?: $pedido->empleado?->empresa?->nombre;

        if (!$nombre) {
            return 'SERVIMERCADEO';
        }

        return str_contains(mb_strtoupper($nombre, 'UTF-8'), 'SERVICIOS') ? 'SYM' : 'SERVIMERCADEO';
    }
}
