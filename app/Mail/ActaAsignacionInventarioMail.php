<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ActaAsignacionInventarioMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nombreEmpleado,
        public string $referencia,
        public string $empresa,
        private string $pdf,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(config('mail.from.address'), config('mail.from.name')),
            subject: 'Acta de entrega - Asignación ' . $this->referencia,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.acta_asignacion_inventario');
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdf, 'Acta_Entrega_' . $this->referencia . '.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
