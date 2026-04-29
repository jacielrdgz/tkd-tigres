<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use App\Models\Traits\BelongsToTenant;

class Horario extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'nombre',
        'hora_inicio',
        'hora_fin',
        'dias',
    ];
}
