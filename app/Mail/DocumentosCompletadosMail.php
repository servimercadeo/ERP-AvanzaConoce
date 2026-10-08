<?php

namespace App\Mail;

use App\Services\EmpresaDelProceso;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DocumentosCompletadosMail extends Mailable
{
    use Queueable, SerializesModels;

    /** Empresa de la requisición que firma el correo (S&M o Servimercadeo). */
    public array $empresa;

    public function __construct(public string $nombres, ?string $documento = null)
    {
        $this->empresa = EmpresaDelProceso::deCedula($documento);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(config('mail.from.address'), config('mail.from.name')),
            subject: 'Confirmación de documentos recibidos - Proceso de contratación',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.documentos_completados');
    }
}
