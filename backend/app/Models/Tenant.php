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
    ];

    protected $casts = [
        'configuracion' => 'array',
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
}
