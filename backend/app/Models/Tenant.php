<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    protected $fillable = [
        'nombre',
        'slug',
        'logo',
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
}
