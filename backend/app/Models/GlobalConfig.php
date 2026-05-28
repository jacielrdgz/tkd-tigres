<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GlobalConfig extends Model
{
    protected $table = 'global_configs';

    protected $fillable = [
        'precio_plan_mensual',
        'dias_trial',
        'correo_bienvenida_texto',
        'correo_rechazo_texto',
        'modo_mantenimiento',
        'modo_mantenimiento_mensaje',
    ];

    protected $casts = [
        'precio_plan_mensual' => 'decimal:2',
        'dias_trial'          => 'integer',
        'modo_mantenimiento'  => 'boolean',
    ];
}
