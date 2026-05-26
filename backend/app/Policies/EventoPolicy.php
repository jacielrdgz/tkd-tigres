<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Evento;

class EventoPolicy
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
    public function view(User $user, Evento $evento): bool
    {
        return in_array($user->role, ['owner', 'secretario', 'instructor']) && $user->tenant_id === $evento->tenant_id;
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
    public function update(User $user, Evento $evento): bool
    {
        return in_array($user->role, ['owner', 'secretario']) && $user->tenant_id === $evento->tenant_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Evento $evento): bool
    {
        return $user->role === 'owner' && $user->tenant_id === $evento->tenant_id;
    }
}
