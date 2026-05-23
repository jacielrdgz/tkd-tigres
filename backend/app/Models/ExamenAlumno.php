<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamenAlumno extends Model
{
    protected $table = 'examen_alumno';

    protected $fillable = [
        'evento_id',
        'alumno_id',
        'evento_alumno_id',
        'grado_actual_id',
        'grado_siguiente_id',
        'costo_examen',
        'resultado',
        'es_historico',
    ];

    public function pivot()
    {
        return $this->belongsTo(EventoAlumno::class, 'evento_alumno_id');
    }

    public function evento()
    {
        return $this->belongsTo(Evento::class);
    }

    public function alumno()
    {
        return $this->belongsTo(Alumno::class);
    }

    public function gradoActual()
    {
        return $this->belongsTo(ConfiguracionCinta::class, 'grado_actual_id');
    }

    public function gradoSiguiente()
    {
        return $this->belongsTo(ConfiguracionCinta::class, 'grado_siguiente_id');
    }
}
