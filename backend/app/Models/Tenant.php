<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    protected $fillable = [
        'nombre',
        'slug',
        'logo',
        'direccion',
        'telefono',
        'disciplina',
        'configuracion',
        'plan',
        'suscripcion_estado',
        'suscripcion_hasta',
        'suscripcion_monto',
        'is_suspended',
    ];

    protected $casts = [
        'configuracion'     => 'array',
        'suscripcion_hasta' => 'date',
        'suscripcion_monto' => 'decimal:2',
        'is_suspended'      => 'boolean',
    ];

    /**
     * Usuarios que pertenecen a este tenant (escuela/dojo).
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Alumnos del tenant.
     */
    public function alumnos()
    {
        return $this->hasMany(Alumno::class);
    }

    /**
     * Eventos del tenant.
     */
    public function eventos()
    {
        return $this->hasMany(Evento::class);
    }

    /**
     * Relación con la Escuela (Perfil de negocio).
     */
    public function escuela()
    {
        return $this->hasOne(Escuela::class);
    }

    /**
     * Historial de suscripciones.
     */
    public function suscripcionHistorial()
    {
        return $this->hasMany(SuscripcionHistorial::class);
    }
}
