<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\BelongsToTenant;

class ConfiguracionCinta extends Model
{
    use BelongsToTenant;

    protected $table = 'configuraciones_cintas';

    protected $fillable = [
        'tenant_id',
        'nombre_nivel',
        'color_hex',
        'color_texto',
        'orden',
        'categoria_label',
    ];
}