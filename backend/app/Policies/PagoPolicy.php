<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Pago;

class PagoPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['owner', 'secretario', 'instructor']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Pago $pago): bool
    {
        return in_array($user->role, ['owner', 'secretario', 'instructor']) && $user->tenant_id === $pago->tenant_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['owner', 'secretario']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Pago $pago): bool
    {
        return in_array($user->role, ['owner', 'secretario']) && $user->tenant_id === $pago->tenant_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Pago $pago): bool
    {
        return $user->role === 'owner' && $user->tenant_id === $pago->tenant_id;
    }
}
