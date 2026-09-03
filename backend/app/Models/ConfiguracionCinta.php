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
        if (is_null($tenantId) && auth()->check()) {
            $tenantId = auth()->user()->tenant_id;
        }

        if ($tenantId && self::where('tenant_id', $tenantId)->exists()) {
            return $query->where('tenant_id', $tenantId)->orderBy('orden');
        }

        // Si no tiene cintas personalizadas, retornar las globales
        return $query->whereNull('tenant_id')->orderBy('orden');
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