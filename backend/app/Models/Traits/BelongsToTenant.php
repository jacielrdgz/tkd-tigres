<?php

namespace App\Models\Traits;

use App\Models\Scopes\TenantScope;
use App\Models\Tenant;

/**
 * Trait para modelos que pertenecen a un tenant (escuela/dojo).
 * 
 * Aplica automáticamente:
 * 1. Global Scope: filtra queries por tenant_id del usuario autenticado
 * 2. Boot: asigna tenant_id automáticamente al crear registros
 * 3. Relación: belongsTo Tenant
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        // Aplicar filtro automático en todas las queries
        static::addGlobalScope(new TenantScope);

        // Asignar tenant_id automáticamente al crear un registro (solo si no es superadmin y el modelo no tiene tenant_id)
        static::creating(function ($model) {
            if (auth()->check() && !auth()->user()->isSuperAdmin() && auth()->user()->tenant_id) {
                if (empty($model->tenant_id)) {
                    $model->tenant_id = auth()->user()->tenant_id;
                }
            }
        });
    }

    /**
     * Relación con el Tenant.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
