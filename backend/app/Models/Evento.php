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
        'precios_cintas',
    ];

    protected $casts = [
        'precios_cintas' => 'array',
    ];

    protected static function booted(): void
    {
        static::saving(function ($evento) {
            if ($evento->costo === '') {
                $evento->costo = null;
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn('eventos', 'precios_cintas')) {
                unset($evento->precios_cintas);
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn('eventos', 'lugar')) {
                unset($evento->lugar);
            }
            if (!\Illuminate\Support\Facades\Schema::hasColumn('eventos', 'costo')) {
                unset($evento->costo);
            }
            if (empty($evento->tenant_id)) {
                $evento->tenant_id = auth()->user()?->tenant_id ?? \App\Models\Tenant::first()?->id ?? 1;
            }
        });
    }

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
