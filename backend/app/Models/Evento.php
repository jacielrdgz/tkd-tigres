<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\BelongsToTenant;

class Evento extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'nombre',
        'tipo',
        'fecha',
        'descripcion',
    ];
}
