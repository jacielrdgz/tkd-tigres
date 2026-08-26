<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

use App\Models\Traits\BelongsToTenant;

use Illuminate\Support\Facades\Storage;

#[Fillable(['name', 'email', 'password', 'tenant_id', 'role', 'avatar', 'is_superadmin', 'escuela_solicitada'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, BelongsToTenant;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_superadmin' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * Verificar si el usuario es el administrador global del sistema.
     */
    public function isSuperAdmin(): bool
    {
        return $this->is_superadmin === true;
    }

    /**
     * Verificar si el usuario es owner.
     */
    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    /**
     * Verificar si el usuario es secretario.
     */
    public function isSecretario(): bool
    {
        return $this->role === 'secretario';
    }

    /**
     * Verificar si el usuario es instructor.
     */
    public function isInstructor(): bool
    {
        return $this->role === 'instructor';
    }

    /**
     * Devuelve la URL pública del avatar o null si no tiene.
     */
    public function getAvatarUrlAttribute(): ?string
    {
        if (!$this->avatar) {
            return null;
        }
        if (str_starts_with($this->avatar, 'http://') || str_starts_with($this->avatar, 'https://') || str_starts_with($this->avatar, 'data:')) {
            return $this->avatar;
        }
        return Storage::disk('public')->url($this->avatar);
    }

    protected $appends = ['avatar_url'];
}

