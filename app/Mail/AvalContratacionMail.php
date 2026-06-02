<?php

namespace App\Mail;

use App\Models\BaseIngreso;
use App\Models\Candidato;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AvalContratacionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Candidato $candidato,
        public ?BaseIngreso $baseIngreso
    ) {}

    public function envelope(): Envelope
    {
        $cargo    = $this->candidato->requisicion?->cargo?->nombre    ?? '';
        $proyecto = $this->candidato->requisicion?->proyecto?->nombre ?? '';
        $ciudad   = $this->candidato->ciudad?->nombre                 ?? '';

        $parts = array_filter([$cargo, $proyecto, $ciudad]);

        return new Envelope(
            from: new Address(
                config('mail.from.address'),
                config('mail.from.name')
            ),
            subject: 'Aval de contratación ' . implode(' ', $parts),
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.aval_contratacion');
    }
}
