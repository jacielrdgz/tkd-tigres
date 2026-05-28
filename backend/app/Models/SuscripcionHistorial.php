<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SuscripcionHistorial extends Model
{
    protected $table = 'suscripcion_historials';

    protected $fillable = [
        'tenant_id',
        'plan',
        'monto',
        'fecha_pago',
        'valido_hasta',
    ];

    protected $casts = [
        'monto'        => 'decimal:2',
        'fecha_pago'   => 'date',
        'valido_hasta' => 'date',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
