<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DireccionEscuela extends Model
{
    protected $table = 'direcciones_escuelas';

    protected $fillable = [
        'escuela_id',
        'calle',
        'numero_exterior',
        'numero_interior',
        'colonia',
        'ciudad',
        'estado',
        'codigo_postal',
        'referencias'
    ];

    public function escuela()
    {
        return $this->belongsTo(Escuela::class, 'escuela_id');
    }
}
