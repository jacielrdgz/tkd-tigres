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
        'lugar',
        'descripcion',
        'costo',
    ];

    public function alumnos()
    {
        return $this->belongsToMany(Alumno::class, 'evento_alumno')
            ->withPivot('id', 'pagado', 'fecha_pago', 'asistio', 'pago_inscripcion')
            ->withTimestamps();
    }

    public function examenAlumnos()
    {
        return $this->hasMany(ExamenAlumno::class);
    }

    public function torneoAlumnos()
    {
        return $this->hasMany(TorneoAlumno::class);
    }

    public function modalidades()
    {
        return $this->hasMany(TorneoModalidad::class);
    }

    public function historialGrados()
    {
        return $this->hasMany(HistorialGrado::class);
    }
}
