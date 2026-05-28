<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SuscripcionVencerMail extends Mailable
{
    use Queueable, SerializesModels;

    public $nombre;
    public $escuela;
    public $fechaVencimiento;

    /**
     * Create a new message instance.
     */
    public function __construct($nombre, $escuela, $fechaVencimiento)
    {
        $this->nombre = $nombre;
        $this->escuela = $escuela;
        $this->fechaVencimiento = $fechaVencimiento;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Aviso: Tu suscripción está próxima a vencer',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.suscripcion-vencer',
        );
    }
}
