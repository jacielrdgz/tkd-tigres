<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CuentaAprobadaMail extends Mailable
{
    use Queueable, SerializesModels;

    public $nombre;
    public $escuela;

    /**
     * Create a new message instance.
     */
    public function __construct($nombre, $escuela)
    {
        $this->nombre = $nombre;
        $this->escuela = $escuela;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '¡Tu cuenta ha sido aprobada!',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.cuenta-aprobada',
        );
    }
}
