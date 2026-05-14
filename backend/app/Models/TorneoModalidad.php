<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TorneoModalidad extends Model
{
    protected $table = 'torneo_modalidades';

    protected $fillable = [
        'evento_id',
        'nombre',
        'categoria',
    ];

    public function evento()
    {
        return $this->belongsTo(Evento::class);
    }

    public function torneoAlumnos()
    {
        return $this->belongsToMany(TorneoAlumno::class, 'torneo_alumno_modalidad', 'modalidad_id', 'torneo_alumno_id')
            ->withPivot('resultado')
            ->withTimestamps();
    }
}
