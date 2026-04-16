<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\BelongsToTenant;

class Asistencia extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'alumno_id',
        'fecha',
        'presente',
    ];

    public function alumno()
    {
        return $this->belongsTo(Alumno::class);
    }
}