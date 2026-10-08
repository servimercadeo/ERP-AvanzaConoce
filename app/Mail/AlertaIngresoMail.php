<?php

namespace App\Mail;

use App\Models\BaseIngreso;
use App\Services\EmpresaDelProceso;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;

class AlertaIngresoMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $formUrl;

    /** Empresa de la requisición que firma el correo (S&M o Servimercadeo). */
    public array $empresa;

    public function __construct(public BaseIngreso $baseIngreso)
    {
        $this->empresa = $baseIngreso->empresa
            ? EmpresaDelProceso::deNombre($baseIngreso->empresa)
            : EmpresaDelProceso::deCedula($baseIngreso->documento_identificacion);
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

    public function attachments(): array
    {
        // Formato de hoja de vida de la empresa de la requisición. Si el de Servimercadeo
        // todavía no está en el servidor, se adjunta el de S&M como hasta ahora.
        [$path, $nombre] = [storage_path('app/documents/HOJA DE VIDA SYM (1).docx'), 'HOJA DE VIDA SYM.docx'];
        $servimercadeo = storage_path('app/documents/HOJA DE VIDA SERVIMERCADEO.docx');
        if ($this->empresa['clave'] === 'servimercadeo' && file_exists($servimercadeo)) {
            [$path, $nombre] = [$servimercadeo, 'HOJA DE VIDA SERVIMERCADEO.docx'];
        }

        Log::info('AlertaIngresoMail attachment path: ' . $path . ' | exists: ' . (file_exists($path) ? 'YES' : 'NO'));

        if (!file_exists($path)) {
            return [];
        }

        return [
            Attachment::fromPath($path)
                ->as($nombre)
                ->withMime('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        ];
    }
}
