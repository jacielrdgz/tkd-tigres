<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

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

    /**
     * Scope para obtener las cintas activas de un tenant (personalizadas o globales por defecto).
     */
    public function scopeForTenant(Builder $query, $tenantId = null): Builder
    {
        if (is_null($tenantId) && auth()->check() && !auth()->user()->isSuperAdmin()) {
            $tenantId = auth()->user()->tenant_id;
        }

        // 1. Si el tenant tiene cintas con su tenant_id, devolver esas
        if ($tenantId && self::where('tenant_id', $tenantId)->exists()) {
            return $query->where('tenant_id', $tenantId)->orderBy('orden');
        }

        // 2. Si existen cintas globales (tenant_id IS NULL), devolver las globales
        if (self::whereNull('tenant_id')->exists()) {
            return $query->whereNull('tenant_id')->orderBy('orden');
        }

        // 3. Fallback seguro: si aún no hay globales y hay registros de tenant
        if ($tenantId) {
            return $query->where('tenant_id', $tenantId)->orderBy('orden');
        }

        return $query->orderBy('orden');
    }

    /**
     * Scope para obtener únicamente las cintas globales base.
     */
    public function scopeGlobales(Builder $query): Builder
    {
        return $query->whereNull('tenant_id')->orderBy('orden');
    }

    /**
     * Comprueba si esta cinta es del catálogo global.
     */
    public function isGlobal(): bool
    {
        return is_null($this->tenant_id);
    }
}