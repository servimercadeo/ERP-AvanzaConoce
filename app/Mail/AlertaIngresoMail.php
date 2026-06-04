<?php

namespace App\Mail;

use App\Models\BaseIngreso;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Crypt;

class AlertaIngresoMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $formUrl;

    public function __construct(public BaseIngreso $baseIngreso)
    {
        $token = urlencode(Crypt::encryptString($baseIngreso->documento_identificacion));
        $this->formUrl = rtrim(config('app.url'), '/') . '/registro-nuevos-ingresos?token=' . $token;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(config('mail.from.address'), config('mail.from.name')),
            subject: 'Completa tu registro de ingreso - ' . $this->baseIngreso->nombre_completo,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.alerta_ingreso');
    }
}
