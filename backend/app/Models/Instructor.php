<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\BelongsToTenant;

class Instructor extends Model
{
    use BelongsToTenant;
    
    protected $casts = [
        'fecha_nacimiento' => 'date:Y-m-d',
        'configuracion_cinta_id' => 'integer'
    ];

    protected $fillable = [
        'tenant_id',
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'fecha_nacimiento',
        'telefono',
        'foto_url',
        'configuracion_cinta_id'
    ];

    public function getFotoUrlAttribute($value): ?string
    {
        if (!$value) return null;
        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://') || str_starts_with($value, 'data:')) {
            return $value;
        }
        return asset('storage/' . $value);
    }

    public function cintaConfig()
    {
        return $this->belongsTo(ConfiguracionCinta::class, 'configuracion_cinta_id');
    }
}
