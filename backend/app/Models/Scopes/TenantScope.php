<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    /**
     * Aplica el filtro de tenant automáticamente a todas las queries.
     * Si hay un usuario autenticado con tenant_id, filtra por él.
     */
    public function apply(Builder $builder, Model $model): void
    {
        $user = auth()->user();

        // No aplicar ningún filtro de tenant si es superadmin o si el usuario no tiene tenant_id
        if ($user && !$user->isSuperAdmin() && $user->tenant_id) {
            $builder->where($model->getTable() . '.tenant_id', $user->tenant_id);
        }
    }
}
