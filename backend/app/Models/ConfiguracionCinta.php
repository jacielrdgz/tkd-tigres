<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConfiguracionCinta extends Model
{
    protected $table = 'configuraciones_cintas';

    protected $fillable = [
        'tenant_id',
        'nombre_nivel',
        'color_hex',
        'color_texto',
        'orden',
        'categoria_label',
    ];



    // Scope para filtrar por tenant
    public function scopeDelTenant($query, $tenantId = 1)
    {
        return $query->where('tenant_id', $tenantId)->orderBy('orden');
    }
}