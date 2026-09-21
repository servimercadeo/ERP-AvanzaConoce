<?php

namespace App\Services;

use App\Models\AsignacionInventario;
use Barryvdh\DomPDF\Facade\Pdf;

/**
 * Acta de entrega para Asignación de Inventario: reutiliza EXACTAMENTE la misma
 * plantilla que las actas de entrega de Dotación y de Pedidos (pdf.acta_entrega_dotacion)
 * — el formato es genérico, sirve para cualquier entrega de inventario a una persona.
 */
class ActaAsignacionInventarioService
{
    public function generar(AsignacionInventario $asignacion, string $creadoPor): string
    {
        $inv = $asignacion->inventarioProducto;
        $sede = $inv?->sede?->nombre;

        $data = [
            'empresa'        => 'SERVIMERCADEO',
            'entregaNumero'  => 'ASIG-' . str_pad((string) $asignacion->id, 4, '0', STR_PAD_LEFT),
            'solicitadoPor'  => $asignacion->asignado_por ?: $creadoPor,
            'fechaRegistro'  => optional($asignacion->fecha_asignacion)->format('d/m/Y') ?? '—',
            'fechaEntrega'   => optional($asignacion->fecha_asignacion)->format('d/m/Y') ?? now()->format('d/m/Y'),
            // No hay traslado entre sedes aquí: la unidad sale del inventario de la
            // misma sede directo a la persona.
            'sedeOrigen'     => $sede ?: '—',
            'sedeDestino'    => $sede ?: '—',
            'solicitadoPara' => $asignacion->user?->name ?: '—',
            'empleadoCedula' => $asignacion->user?->cedula ?: '—',
            'observaciones'  => $asignacion->observacion,
            'items'          => [[
                'producto' => $inv?->tipoProducto?->nombre ?? '—',
                'tipo'     => $asignacion->serial ?: ($inv?->talla ?: '—'),
                'cantidad' => $asignacion->cantidad,
            ]],
            'generadoEl'     => now()->format('d/m/Y H:i'),
        ];

        return Pdf::loadView('pdf.acta_entrega_dotacion', $data)->setPaper('a4')->output();
    }
}
