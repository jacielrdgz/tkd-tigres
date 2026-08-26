<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\ConfiguracionCinta;
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
        'configuracion_cinta_id',
        'horario_id',
        'estatus',
        'dia_pago',
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
        if (str_starts_with($this->foto, 'http://') || str_starts_with($this->foto, 'https://') || str_starts_with($this->foto, 'data:')) {
            return $this->foto;
        }
        return asset('storage/' . $this->foto);
    }

    public function pagos()
    {
        return $this->hasMany(Pago::class);
    }

    public function ultimoPago()
    {
        // Último pago por fecha de pago.
        return $this->hasOne(Pago::class)->latestOfMany('fecha_pago');
    }

    public function asistencias()
    {
        return $this->hasMany(Asistencia::class);
    }

    public function cintaConfig()
    {
        return $this->belongsTo(ConfiguracionCinta::class, 'configuracion_cinta_id');
    }

    public function horarioConfig()
    {
        return $this->belongsTo(Horario::class, 'horario_id');
    }

    public function eventos()
    {
        return $this->belongsToMany(Evento::class, 'evento_alumno')
            ->withPivot('id', 'pagado', 'fecha_pago', 'asistio', 'pago_inscripcion')
            ->withTimestamps();
    }

    public function examenesDetalle()
    {
        return $this->hasMany(ExamenAlumno::class);
    }

    public function historialGrados()
    {
        return $this->hasMany(HistorialGrado::class)->orderByDesc('fecha_ascenso');
    }

    public function torneosDetalle()
    {
        return $this->hasMany(TorneoAlumno::class);
    }
}