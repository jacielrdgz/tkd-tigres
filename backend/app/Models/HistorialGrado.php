<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HistorialGrado extends Model
{
    protected $table = 'historial_grados';

    protected $fillable = [
        'alumno_id',
        'evento_id',
        'grado_anterior_id',
        'grado_nuevo_id',
        'fecha_ascenso',
    ];

    protected $casts = [
        'fecha_ascenso' => 'date',
    ];

    public function alumno()
    {
        return $this->belongsTo(Alumno::class);
    }

    public function evento()
    {
        return $this->belongsTo(Evento::class);
    }

    public function gradoAnterior()
    {
        return $this->belongsTo(ConfiguracionCinta::class, 'grado_anterior_id');
    }

    public function gradoNuevo()
    {
        return $this->belongsTo(ConfiguracionCinta::class, 'grado_nuevo_id');
    }
}
