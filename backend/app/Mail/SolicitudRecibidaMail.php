<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SolicitudRecibidaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nombreUsuario,
        public string $nombreEscuela,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '✅ Solicitud recibida — ' . config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.solicitud-recibida',
        );
    }
}
