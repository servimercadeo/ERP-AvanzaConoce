<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ActaEntregaDotacionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nombreEmpleado,
        public string $codigoPedido,
        public string $empresa,
        private string $pdf,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(config('mail.from.address'), config('mail.from.name')),
            subject: 'Acta de entrega de dotación - Pedido #' . $this->codigoPedido,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.acta_entrega_dotacion');
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdf, 'Acta_Entrega_Dotacion_' . $this->codigoPedido . '.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
