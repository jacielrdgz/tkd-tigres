<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\BelongsToTenant;
use Carbon\Carbon;

class Alumno extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'nombre_tutor',
        'telefono_tutor',
        'email',
        'fecha_nacimiento',
        'foto',
        'cinta',
        'estatus',
        'horario',
    ];

    protected $appends = ['edad', 'foto_url'];

    public function getEdadAttribute(): ?int
    {
        return $this->fecha_nacimiento
            ? Carbon::parse($this->fecha_nacimiento)->age
            : null;
    }

    public function getFotoUrlAttribute(): ?string
    {
        if (!$this->foto) return null;
        return asset('storage/' . $this->foto);
    }

    public function pagos()
    {
        return $this->hasMany(Pago::class);
    }

    public function asistencias()
    {
        return $this->hasMany(Asistencia::class);
    }
}