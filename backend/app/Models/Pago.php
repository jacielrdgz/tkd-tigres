<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\BelongsToTenant;

class Pago extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'alumno_id',
        'tipo',
        'mes',
        'fecha_inicio',
        'fecha_fin',
        'monto',
        'metodo_pago',
        'estado',
        'fecha_pago',
    ];

    public function alumno()
    {
        return $this->belongsTo(Alumno::class);
    }
}