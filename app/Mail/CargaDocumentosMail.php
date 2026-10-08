<?php

namespace App\Mail;

use App\Services\EmpresaDelProceso;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Crypt;

class CargaDocumentosMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $uploadUrl;

    /** Empresa de la requisición que firma el correo (S&M o Servimercadeo). */
    public array $empresa;

    public function __construct(
        public string $nombres,
        public string $documento,
    ) {
        $token = urlencode(Crypt::encryptString($documento));
        $this->uploadUrl = rtrim(config('app.url'), '/') . '/carga-documentos?token=' . $token;
        $this->empresa = EmpresaDelProceso::deCedula($documento);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(config('mail.from.address'), config('mail.from.name')),
            subject: 'Carga tus documentos de contratación',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.carga_documentos');
    }
}
