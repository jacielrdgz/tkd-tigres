<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Alumno;

class AlumnoPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['owner', 'secretario', 'instructor', 'admin']) || $user->isSuperAdmin();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Alumno $alumno): bool
    {
        if ($user->isSuperAdmin()) return true;
        return in_array($user->role, ['owner', 'secretario', 'instructor', 'admin']) && $user->tenant_id === $alumno->tenant_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['owner', 'secretario', 'admin']) || $user->isSuperAdmin();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Alumno $alumno): bool
    {
        if ($user->isSuperAdmin()) return true;
        return in_array($user->role, ['owner', 'secretario', 'admin']) && $user->tenant_id === $alumno->tenant_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Alumno $alumno): bool
    {
        if ($user->isSuperAdmin()) return true;
        return in_array($user->role, ['owner', 'admin']) && $user->tenant_id === $alumno->tenant_id;
    }
}
