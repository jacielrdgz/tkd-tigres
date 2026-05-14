<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TorneoAlumno extends Model
{
    protected $table = 'torneo_alumno';

    protected $fillable = [
        'evento_id',
        'alumno_id',
        'costo_torneo',
        'resultado',
    ];

    public function evento()
    {
        return $this->belongsTo(Evento::class);
    }

    public function alumno()
    {
        return $this->belongsTo(Alumno::class);
    }

    public function modalidades()
    {
        return $this->belongsToMany(TorneoModalidad::class, 'torneo_alumno_modalidad', 'torneo_alumno_id', 'modalidad_id')
            ->withPivot('resultado')
            ->withTimestamps();
    }
}
