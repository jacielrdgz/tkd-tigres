<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SolicitudRechazadaMail extends Mailable
{
    use Queueable, SerializesModels;

    public $nombre;
    public $motivo;

    /**
     * Create a new message instance.
     */
    public function __construct($nombre, $motivo)
    {
        $this->nombre = $nombre;
        $this->motivo = $motivo;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Tu solicitud de cuenta ha sido declinada',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.solicitud-rechazada',
        );
    }
}
