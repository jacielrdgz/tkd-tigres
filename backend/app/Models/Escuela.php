<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Escuela extends Model
{
    protected $table = 'escuelas';

    protected $fillable = [
        'tenant_id',
        'nombre',
        'titular',
        'logo_url',
        'disciplina',
        'eslogan',
        'descripcion',
        'telefono_contacto',
        'email_contacto',
        'redes_sociales'
    ];

    protected $casts = [
        'redes_sociales' => 'json'
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function direccion()
    {
        return $this->hasOne(DireccionEscuela::class, 'escuela_id');
    }
}
